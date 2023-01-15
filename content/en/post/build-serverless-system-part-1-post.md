---
date: 2023-01-02T08:13:08-04:00
tags: ["Aws" , "IAC", "Pulumi", "Cloud"]
title: "Build serverless system with Pulumi and AWS (Part 1)"
toc: true
featured_image: "/images/pulumi-aws.jpeg"
---
## Introduction

In my journey in the cloud and in the preparation of cloud certifications, I have been inspired by the AWS workshops carried out and generously made available to everyone by the AWS team. 

[This workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/b34eab03-4ebe-46c1-bc63-cd2d975d8ad4/en-US) which deals with the implementation of a serverless system is a must for all aspiring cloud engineers. It covers both the event-driven approach and the synchronous web-server mechanism. 

In this post, we are working to resume the basic concept but bringing a DevOps concept with a pipeline to automate our deployments and also adding a front-end part also deployed in an automated way in the cloud. Let's have some fun! 😉

![I regret this decision!](/images/decision-regret.gif) 

### Functional requirements

1. The application should expose an endpoint to retrieve all orders items present in the database.
2. The application should expose an endpoint to update a particular order item present in the database.
3. The application should expose an endpoint to delete a particular order item present in the database.

## Architecture diagram

![Serveless system sync architecture](/images/serverless-system/serverless-system-arch.svg) 

Our application named **ORDER-API** is responsible for:

1. Creating synchronous REST API with all CRUD operations by using **API Gateway**, **Lambda** and **DynamoDB**. **(Part 1)**
2. Exposing POST method to asynchronous method with **SQS** and Lambda Poller and adding **Step functions** to orchestrate POST operations with additional Lambda functions. **(Part 2)**
3. Adding authentication mechanism to your API Gateway(with **AWS Incognito**), then it will only allow authenticated users to access API by using OAuth2 scopes. **(Part 3)**
4. Providing an UI interface to end users with **React**. **(Part 4)**

## CI/CD Pipeline

![IAC serverless infra pipeline](/images/serverless-system/iac-pipeline.svg) 

For this project, we will distinguish two types of infra as code: The first will be carried out by Github actions and it will be responsible for creating cloud resources such as **Codepipeline**, **Codebuild**, **ECR**, **Cloudformation** and the second one will rely on Codepipeline(We'll dive in later).
For the provisioning phase, Github actions will entrust the task to **Pulumi** for the generation of cloud resources.

> Pulumi ??? :open_mouth:  

### Pulumi

[Pulumi](https://www.pulumi.com) is an universal Infrastructure code as [Terraform](https://www.terraform.io). In my career so far, I've always used Terraform as an Iac tool because it's super popular and doesn't require knowledge of any particular programming language. But Pulumi is more aimed at an audience of developers because it allows you to do DevOps using the language you like while of course keeping the same engineering practices that Terraform offers you.

Thanks to Pulumi, we will deploy Codepipeline as well as the other components necessary to deploy our application resources:
1. AWS ECR will host lambda docker images.
2. AWS Codebuild will build , tag our docker images , then prepare the output template for Cloudformation.
3. AWS Cloudformation will create our resources.

Here's the pipeline triggered by any push to the serverless-system branch:

{{< gist yvesDenis 950c52c537d66d02699d43f8d4ce4960 >}} 

In order to use the remote pulumi service , you need to create an account into https://app.pulumi.com/, setup a project and create a token for Github. https://www.pulumi.com/docs/get-started/.

All the pulumi configuration is here , i chose Golang to write the source code: https://github.com/yvesDenis/website-projects-articles/tree/serverless-system/serverless-system/iac-pulumi

## API Gateway - Lambda Sync

![ApiGateway lambda integration](/images/serverless-system/apigateway-lambda-sync.svg) 

```
/orders/: Users can call this resource:
 - GET: Show order details - API Gateway -> Lambda -> DynamoDB
 - PUT: Create new order - API Gateway -> Lambda -> DynamoDB

 /orders/{userId}/order/{id}: Users can call this resource to delete a particular order
 - DELETE: Delete an order - API Gateway -> Lambda -> DynamoDB

```

The three resources business logic will be implemented inside lambdas with Golang runtime. For Lambda packaging , i chose to dockerize the source code and host the image inside a private repository in AWS ECR.

1. GetOrders service : https://github.com/yvesDenis/website-projects-articles/tree/serverless-system/serverless-system/lambda/get_orders

2. CreateOrder service : https://github.com/yvesDenis/website-projects-articles/tree/serverless-system/serverless-system/lambda/create_orders

3. DeleteOrder service : https://github.com/yvesDenis/website-projects-articles/tree/serverless-system/serverless-system/lambda/delete_orders

### Deployment

To deploy all that stuff, we just need to push our changes in the serverless-system branch and Codepipeline will take care of the rest by triggering a pipeline execution. The pipeline has 3 stages:

- Source stage: Codepipeline loads all your source code inside a temporary directory.
- Build stage: Codepipeline triggers Codebuild for eventual application building or testing. Codebuild looks for the file buildspec.yml:

{{< gist yvesDenis 583b46a80ca1a9ef1414137d5c6cfdcf >}} 

Codebuild will log into AWS ECR , retrieves the revision commit hash for tagging docker images. In this project , we use [SAM](https://docs.aws.amazon.com/serverless-application-model/index.html) , which is open-source framework that enables you to build serverless applications on AWS. 

The [sam build](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html) validates our [configuration template](https://github.com/yvesDenis/website-projects-articles/blob/serverless-system/serverless-system/template.yaml), build docker images and creates an hidden folder .aws-sam/

The [sam package](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-package.html), in the other end , will upload lambda docker images and load all the artifacts inside a bucket S3 that it'll automatically create when passed --resolve-s3. A file packaged-template.yaml , will be generated by the end of the process and it'll contain all necessary image uri references for lambdas startup and any s3 references.

- Deploy stage: This stage relies on cloudformation for resources deployment. Cloudformation will look for the output file created in the previous stage and will carry out the resources creation(ApiGateway,Lambda, DynamoDB, roles, policies)

![Codepipeline](/images/serverless-system/codepipeline-screenshot.png) 

### Integration Testing

Let's try to test it out by making a request via API gateway:

```
# Create an order
curl --location --request PUT 'https://{apigateawayID}.execute-api.ca-central-1.amazonaws.com/Dev/orders' \
--header 'Content-Type: application/json' \
--data-raw '{
    "user_id": "Burger_2",
    "quantity": "3",
    "restaurant_id": "Restaurant 3"
}'

# Get Orders
Request:
    curl --location --request GET 'https://{apigateawayID}.execute-api.ca-central-1.amazonaws.com/Dev/orders'
Response:
    [{"user_id":"Burger_2","restaurant_id":"Restaurant 3","quantity":"3","id":"81","created_at":"2023-01-02T22:06:33.637839308Z","order_status":"PENDING"}]


# Delete an order
curl --location --request DELETE 'https://{apigateawayID}.execute-api.ca-central-1.amazonaws.com/Dev/order/Burger_2/id/81'

```

### Local Testing

For local testing , there's a makefile inside each lambda folder: 

{{< gist yvesDenis cc0a4b319d803286dbb2e4c4518cba18 >}} 

## Conclusion

For this first part , we set up two CI/CD pipelines , one triggered by Github action for deploying codepipeline with its related components and the other is handled by Codepipeline to update, create or remove our resources involved in the Api gateway integration with lambda. For the second part , we'll break down the event-driven approach with our  same APigateway but integrated with SQS and Step functions. To be continued... 😉
