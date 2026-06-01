---
title: "From Notebook to AI-Augmented MLOps: Predicting Retail Customer Churn in 3 Phases 🚀"
date: 2026-05-31T10:00:00-05:00
tags: ["MLOps", "AWS", "Python", "MachineLearning", "Claude", "Terraform", "DVC"]
toc: true
featured_image: "/images/ilya-pavlov-OqtafYT5kTw-unsplash.jpg"
draft: false
---

## Introduction 🧠

You've trained a model. It works great on your laptop. You ship it. Six months later, nobody's maintained it, the predictions are garbage, and your data scientist has moved on. Sound familiar?

![This is fine — ML model on fire with no monitoring](/images/memes/this-is-fine.jpg)

*Every ML team at some point. Don't be this dog. 🐶🔥*

That's exactly the problem this project tackles — head on, in three progressive phases. We're building a **customer churn prediction system for retail**, starting from a messy Jupyter notebook and ending with an **autonomous AI agent** that monitors drift and retrains the model without you lifting a finger.

Here's the full source: [website-projects-articles / mlops / retail-churn-prediction](https://github.com/yvesDenis/website-projects-articles/tree/master/mlops/retail-churn-prediction)

Let's go. 🏃

---

## The Big Picture 🗺️

Three phases, each leveling up the maturity of the system:

| Phase | Where | What's new |
|-------|-------|-----------|
| 1 — Local 🖥️ | Laptop | MLflow, DVC, FastAPI, Docker |
| 2 — Cloud ☁️ | AWS | ECS, Terraform, CI/CD, drift alerts |
| 3 — AI Agent 🤖 | AWS + Claude | Autonomous drift triage and retraining |

<picture>
  <source srcset="/images/diagrams/retail-churn-prediction/overview.svg" type="image/svg+xml">
  <img src="/images/diagrams/retail-churn-prediction/overview.png" alt="Three-phase MLOps architecture overview" loading="lazy">
</picture>

---

## Phase 1 — Getting Out of Notebook Hell 🖥️

### The Dataset

We're using the classic **Telco Customer Churn** dataset — 19 features describing retail customers (contract type, monthly charges, tenure, internet service, etc.) with a binary `Churn` label.

The first move is breaking the notebook monolith into proper modules:

```
phase-1/src/
├── preprocess.py   # feature engineering
├── train.py        # CLI training pipeline
├── evaluate.py     # metrics
└── api/main.py     # FastAPI prediction service
```

### 🛠️ The Training Pipeline

`train.py` is a CLI script — no notebook kernels dying mid-run, no hidden state, no "just re-run cells 3 through 7":

```python
# stratified split to preserve churn ratio
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# preprocessor fitted on TRAINING data only — no leakage 🎯
preprocessor = build_preprocessor()
preprocessor.fit(X_train)

model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth)
model.fit(preprocessor.transform(X_train), y_train)
```

The preprocessor handles:
- `StandardScaler` on numerical features (tenure, MonthlyCharges, TotalCharges)
- `OneHotEncoder` on 15 categorical features (gender, Contract, PaymentMethod, etc.)

### ✅ The Quality Gate

This is the part most teams skip and then regret:

```python
if roc_auc < 0.78:
    print(f"❌ Quality gate failed: ROC-AUC {roc_auc:.4f} < 0.78")
    sys.exit(1)
```

If your model doesn't clear **ROC-AUC ≥ 0.78**, the pipeline exits with an error. CI fails. Nothing deploys. This one line saves you from shipping a garbage model at 3am.

### 📦 MLflow + DVC

- **MLflow** tracks every run locally (`mlruns/`): params, ROC-AUC, F1, precision, recall. Browse them with `make mlflow` → UI on port 5001.
- **DVC** versions the data and model artifacts so you can reproduce *any* previous run.

### 🌐 The FastAPI Service

```python
@app.post("/predict")
async def predict(customer: CustomerFeatures):
    prob = model.predict_proba(X)[0][1]
    label = "Churned" if prob > 0.5 else "Retained"
    risk = "high" if prob > 0.7 else "medium" if prob > 0.4 else "low"
    return {"probability": prob, "label": label, "risk_category": risk}
```

Three-tier risk output — high/medium/low — because "73% churn probability" means more to a business analyst when you call it **high risk**. 

Run it all with Docker Compose: `make serve`.

---

## Phase 2 — Taking It to AWS ☁️

Local works great. But you can't share `localhost:8000` with your stakeholders. Time to go cloud.

![Morpheus — What if I told you localhost is not a production server](/images/memes/morpheus.jpg)

*What if I told you... your laptop was never the deploy target. 😅*

### 🏗️ The Infrastructure (Terraform)

The whole AWS setup is declarative Terraform — 11 modules, ~$25/month:

<picture>
  <source srcset="/images/diagrams/retail-churn-prediction/aws-infra.svg" type="image/svg+xml">
  <img src="/images/diagrams/retail-churn-prediction/aws-infra.png" alt="Phase 2 AWS infrastructure architecture" loading="lazy">
</picture>

Key decisions worth calling out:

- **ECS Fargate, not SageMaker** — SageMaker is powerful but pricey. FastAPI on Fargate gives you the same HTTP endpoint for a fraction of the cost. 💸
- **RDS t4g.micro** — ARM-based, tiny, cheap. PostgreSQL 16 storing every prediction as JSONB for later drift analysis.
- **SSM Parameter Store for secrets** — `DATABASE_URL` never touches environment variables directly. ECS fetches it at runtime.
- **GitHub OIDC — no long-lived credentials** — the GitHub Actions role assumes an AWS role via OIDC. Zero static access keys to rotate or accidentally commit. 🔐

### 🚀 CI/CD in 3 Jobs

```yaml
# .github/workflows/ci-cd.yml
jobs:
  evaluate:   # train + quality gate + push artifacts to S3
  build:      # docker build + push to ECR (tagged with commit SHA)
  deploy:     # update ECS task definition + wait for stability
```

The SHA tag is clutch — every deploy is traceable to the exact commit that produced it. `latest` is there for convenience but SHA is what actually matters.

### 📊 Drift Monitoring with Evidently

Once predictions start logging to PostgreSQL, `drift_report.py` compares the live distribution against the training baseline using [Evidently](https://www.evidentlyai.com/):

```python
# load training baseline vs recent predictions from DB
reference = load_reference()
current = load_current()   # queries PostgreSQL

report = Report(metrics=[DataDriftPreset()])
report.run(reference_data=reference, current_data=current)
```

When drift is detected, an SNS message fires to Slack: *"X% of features drifted, recommend retraining."*

Manual. Better than nothing. But a human still has to decide what to do. That changes in Phase 3. 👇

---

## Phase 3 — The AI Agent Takes the Wheel 🤖

Drift alert fires. You get the Slack ping. You open the drift report. You squint at the p-values. You decide whether to retrain. You pick hyperparameters. You run the pipeline. You check the new metrics.

What if Claude just... did all of that for you?

![Distracted boyfriend — Me ignoring manual ops, looking at AI agents](/images/memes/distracted-boyfriend.jpg)

*Sorry manual ops, I've moved on. 🙃*

### 🧠 What is an Agent?

A plain language model reads text and outputs text. An **agent** is a language model that can also *take actions* — call tools, get results, decide what to do next, repeat.

Claude doesn't run the tools itself. It *decides* which tool to call with what arguments. Python runs the actual function and feeds the result back. Claude reads it, thinks, decides the next tool call. The loop continues until Claude says it's done.

### 🔧 The Four Tools

```python
TOOLS = [
    get_drift_summary,           # parse drift_report.json → feature drift scores
    get_current_model_metrics,   # query MLflow → ROC-AUC, F1, hyperparams
    run_training,                # subprocess: train.py with chosen n_estimators, max_depth
    save_remediation_report      # write markdown audit log
]
```

### 🔄 The Agentic Loop

```python
messages = [initial_task]
while True:
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        tools=TOOLS,
        messages=messages
    )

    if response.stop_reason == "end_turn":
        return response.content[0].text   # done ✅

    if response.stop_reason == "tool_use":
        results = execute_tools(response)
        messages.append(tool_results)
        continue   # next turn
```

### 🎯 The Decision Framework

Claude's system prompt gives it explicit thresholds:

| Drift Share | Action |
|------------|--------|
| < 20% | Monitor only, no retraining |
| 20–40% | Evaluate — retrain only if metrics improve |
| > 40% | Retrain 🚨 |

Hyperparameter selection logic is baked in too:
- Numerical features drifted → increase `n_estimators` (200–300)
- Categorical features drifted → increase `max_depth` (10–12)
- Both → `n_estimators=200, max_depth=10` as starting point

### 🎬 A Real Agent Run (42% Drift)

Here's what a typical execution looks like — 5 turns, zero human decisions:

<picture>
  <source srcset="/images/diagrams/retail-churn-prediction/agent-loop.svg" type="image/svg+xml">
  <img src="/images/diagrams/retail-churn-prediction/agent-loop.png" alt="Claude agent agentic loop sequence for drift remediation" loading="lazy">
</picture>

The model that gets deployed is traceable to a specific drift event, specific hyperparameters, and a specific reasoning chain. Every run writes a markdown audit report automatically. 📄

### 🛡️ Safety

The agent isn't running unsupervised in production. It runs when you trigger `make agent` — it handles the *triage and execution*, but the deploy-to-prod step still has a human gate. Up to 2 retries if the quality gate fails, never exceeds 10 turns total.

---

## Results & Key Lessons 🏆

Running all three phases end to end:

- ✅ ROC-AUC maintained ≥ 0.78 across all phases
- ✅ Zero manual operational steps by Phase 3
- ✅ AWS bill under $30/month (Fargate + t4g.micro RDS + S3)
- ✅ LLM-based drift diagnosis correct in 4/5 test scenarios

The biggest lessons:

**1. Quality gates are non-negotiable.** That `sys.exit(1)` is worth more than any amount of manual review.

**2. Fit your preprocessor on training data only.** Obvious in hindsight, catastrophic if missed.

**3. Don't over-engineer early.** Phase 1 is deliberately simple. Phase 2 adds only what Phase 1 can't do. Phase 3 adds only what Phase 2 can't do.

**4. AI agents aren't magic — they're a loop.** The power comes from giving Claude good tools and a clear decision framework. The model doesn't need to be creative; it needs to be consistent.

![Success Kid — shipped the model, it didn't drift for 3 months](/images/memes/success-kid.jpg)

*That feeling when your MLOps setup actually works and the model retrains itself at 3am. 💪*

---

## Conclusion 🎯

We went from a Jupyter notebook to a production-grade, self-healing ML system in three deliberate phases — no shortcuts, no magic. Each phase is independently useful. You don't need Phase 3 to benefit from Phase 1.

If you're managing ML models in production without drift monitoring, you're flying blind. If you have drift monitoring but it's just Slack pings, you're flying with your eyes closed. Phase 3 opens them. 👀

Grab the full source, start with Phase 1, and level up at your own pace:
👉 [github.com/yvesDenis/website-projects-articles/tree/master/mlops/retail-churn-prediction](https://github.com/yvesDenis/website-projects-articles/tree/master/mlops/retail-churn-prediction)
