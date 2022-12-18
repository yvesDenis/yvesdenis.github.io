---
date: 2022-12-18T11:20:08-04:00
tags: ["Aws" , "IAC", "DevOps", "Cloud"]
title: "Build, deploy and run an application with ECR, ECS and Codebuild (Part 2)"
toc: true
featured_image: "/images/aws_terraform.png"
---

## Introduction

This is the second part of our project including ECS, ECR, Codebuild, github actions. You can find the first part [here]({{< ref "ecs-ecr-codebuild-part-1-post" >}}).

This part will focus more on the deployment of our application (its container image), the unit tests executed by Codebuild at each push in github and finally we can test through our web browser if our application responds as expected.

The source code of the whole project : https://github.com/yvesDenis/website-projects-articles/tree/master/deploy-app-aws-ecs


## Architecture diagram

![ecs,codebuild and ecr call diagram](/images/ecs-ecr/codebuild-ecr-ecs-project-deploy.svg)

The diagram above should be the production status of our infrastructure. Our ECS cluster will be deployed on two private subnets in which will be the autoscaling group , which with the help of a launchTemplate, will instantiate a pair of EC2s which will be the receptacle of the ecs tasks.

## Github workflow

Before testing all these beautiful people. One of our goals at the beginning of this project was to stay close to a real-world situation. So we decided to automate our unit tests via Codebuild and the update of our image in the AWS ECR remote repository.

Here's the diagram of our Gitops pipeline.

![Github workflow](/images/ecs-ecr/build-deploy-aws-ecs.drawio.png)

AWS has provided a starter GitHub workflow that takes advantage of the AWS open-source GitHub Actions to build and deploy containers on ECS for each commit to master branch of the repository.

https://docs.github.com/en/actions/deployment/deploying-to-your-cloud-provider/deploying-to-amazon-elastic-container-service

This github workflow contains just a single job whose first step is to query the status of unit tests that have been run in codebuild.

![codebuild build history success](/images/ecs-ecr/codebuild_build_history_success.png)

Our codebuild project sends unit test status report to Github asynchronously.

![codebuild report build status](/images/ecs-ecr/codebuild_report_build_status.png)

Once the unit tests status is positive. Our pipeline, after retrieving temporary credentials, will build our application and build the docker image that will later be pushed into ECR by tagging our image with the commit ID.

![ECR repo name](/images/ecs-ecr/ecr_repo_name.png) 

![ECR base repo](/images/ecs-ecr/ecr_base_repo.png) 

The image being present in the repository, we can update the ECS task definition and redeploy the image in ECS.

![ECR base app cluster service](/images/ecs-ecr/ecs_base_app_cluster_service.png)

![ECR base app task](/images/ecs-ecr/ecs_base_app_task.png)


## Integration test

During the first part of this article, we deployed our ECS cluster with the autoscaling group and the application load balancer which is directly connected with the Internet Gateway.
To test our application, we will need the domain name of the ALB.

![ALB domain name](/images/ecs-ecr/alb_domain_name.png)

After launching this request via the browser: https://base-app-alb-1758938518-ca-central-1.elb.amazonaws.com/hello

We should get this result:

![Base app test result](/images/ecs-ecr/base_app_test_result.png)

## Conclusion

This project, which was done in two parts, covered the complete production cycle of an application in the cloud.
Let me know in the comments what you think :wink:



