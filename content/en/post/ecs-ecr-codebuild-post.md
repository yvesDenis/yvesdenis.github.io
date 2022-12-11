---
date: 2022-12-11T11:20:08-04:00
tags: ["Aws" , "IAC", "DevOps", "Cloud"]
title: "Build, deploy and run an application with ECR, ECS and Codebuild (Part 1)"
toc: true
featured_image: "/images/aws_terraform.png"
---

## Introduction

In this article, we will follow the complete development cycle of a real-world application from its conception to its production.
Nowadays, the wind of the moment pushes us all to turn to the cloud because in many aspects it offers more advantages compared to on-premises systems. 

I decided to divide this tutorial into two parts given its volume, so for this first part, we will focus in more detail on the infrastructure to be deployed and the motivation behind the choice of technologies used. 

The source code of this first part : https://github.com/yvesDenis/website-projects-articles/tree/complete-task/deploy-app-aws-ecs/iac

## Architecture diagram

![build and deploy IAC for ecs,codebuild and ecr](/images/codebuild-ecr-ecs-project.svg)

We opted for a scenario as close as possible to a real production situation. To do this, our technology platform includes a continuous integration and deployment chain using Github actions, which also serves as our VCS.
The deployment of the cloud infrastructure will be done using Terragrunt.

*Hold on Mister! What is Terragrunt and why the hell are you using it?* 😰

### Terragrunt

[Terragrunt](https://terragrunt.gruntwork.io/) is a thin wrapper that provides extra tools for keeping your configurations DRY, working with multiple Terraform modules, and managing remote state. It helps avoiding 
configuration duplication and for our use-case ,its [run-all command](https://terragrunt.gruntwork.io/docs/features/execute-terraform-commands-on-multiple-modules-at-once/) is useful for us as we don't want to write large script files to deploy each terraform module.

There are several ways to manage the state of modules with terraform. The most common is the one with S3 and DynamoDb for locking but Hashicorp, for some time, has been deploying a [free Saas Terraform cloud solution](https://app.terraform.io/) which allows you to execute Terraform commands directly in an online console and to preserve the state of the modules. This is the main reason why we chose Terraform Cloud because it integrates so well with Terragrunt.

### AWS Codebuild

Our app needs to be tested on every push. For testing, [Codebuild](https://aws.amazon.com/codebuild/) seems really suitable because it has a natural integration with external providers such as Github , Gitlab, bitbucket , etc... and it is agentless and serverless , so no need to manage the servers below and we pay for what we use with the principle of pay-as-you-go. It is mainly used for builds but since the application will be built directly in the docker image, it is not necessary to build it again in Codebuild.

{{< gist yvesDenis 5dfe68816b926ae392a62920a498b5d9 >}}

The webhook above is necessary cause we want Codebuild to execute tests every time a change is pushed to our repository.

### AWS ECR

Apps that run in containers need a Docker image deployed in a public or private remote repository. In our case, our choice fell on the [Elastic Container repository (ECR)](https://aws.amazon.com/it/ecr/) cloud solution which allows us to host the Docker image of our [mini app written in Golang](https://github.com/yvesDenis/website-projects-articles/tree/complete-task/deploy-app-aws-ecs/base-app).

{{< gist yvesDenis 39d3f62049569265e497ae5208cde67f >}}

### AWS ECS

[ECS](https://aws.amazon.com/it/ecs/) is a container orchestration service. It is fully managed by AWS and is highly scalable and secure. For the moment it suffers from competition with its neighbor EKS which, in addition to being open-source through Kubernetes, is more complex but more used in business. However, when we take a closer look, we realize that ECS is easier to tame, especially for all those who have not used a containerization solution in the past. That's why i gave it a try 😉

{{< gist yvesDenis 2594dd4ec6e7ed1c0f29e2a2cc6cbfff >}}

We chose to use EC2 instances instead of Fargate. The created cluster comes with the following components:

- [ALB (Application load balancer)](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html): Internet faced to test the app via the Internet
- [AutoScaling group](https://aws.amazon.com/it/autoscaling/): To manage the automatic scaling of EC2 instances via the launch-template
- [ALB Target-Groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html): To link the ALB and the autoscaling-group.
- [ECS Service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html): To run and maintain a specified number of instances of a task definition simultaneously in an Amazon ECS cluster.
- [Task](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html): Instantiation of a task definition within a cluster.

### Compliance tests with Inspec

[Chef InSpec](https://www.chef.io/blog/making-use-of-inspec-aws-cloud-resource) is an open-source testing framework for infrastructure with human as well as machine-readable language for specifying compliance and security policy requirements. It helps us check that our cloud components are well deployed and work as expected. It's part of our continuous pipeline but operates at the end of the deployement to make sure anything is fine.
For thsi tutorial , we only test ECS components and ECR repository as so far there's no InSpec audit resource for Codebuild.

## Continuous deployment pipeline with Github actions

Here's the job responsible to deploy our infrasctructure:

{{< gist yvesDenis c2c180f611cdd0c19b23b22a3eca49df >}}

To make Giyhub interact with AWS resources , you need to [configure OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) 

1. Github source code checkout
2. Configure AWS credentials
3. Install terragrunt and terraform
4. Create a hidden file .terraformrc with [Tfc token](https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens) to log into Terraform cloud
5. Terragrunt validate
6. Terragrunt plan
5. Terragrunt apply once for all terraform mdoules
7. Run compliance tests to ECS ans ECR resources.

With this set-up , if you push you changes to an iac-prefix branch , your AWS resources will be deployed.

![Goal celebration](/images/goal_giphy.gif)

## Summary

In this first part we covered the ECS-ECR-Codebuild configuration deployment with compliance tests. For the second part we'll focus on the application testing through the browser and unit tests execution and results.