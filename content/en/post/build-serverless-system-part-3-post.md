---
title: "Build serverless system with Pulumi and AWS (Part 3)"
date: 2023-01-21T14:17:20-05:00
tags: ["Aws", "IAC", "Pulumi", "Cloud", "Auth"]
toc: true
featured_image: "/images/pulumi-aws.jpeg"
draft: false
---

## Introduction

Here we are at the end of our long journey in the cloud which led us to implement our serveless system in synchronous and asynchronous mode.

Our application meets the basic functional requirements to be used in production, however we cannot release a digital system without worrying about security. Security allows us to retain our customers, to assure them of the protection and anonymity of their data which passes through our application. It also protects us against malicious attacks.

So this third step focuses on authenticating our users. Whoever wants to use our application must first present himself in order to generate a token, then using the latter, he can circulate through the system.

[The full source code of this project](https://github.com/yvesDenis/website-projects-articles/tree/serverless-system/serverless-system)

### Functional requirements

1. Any request with an empty token results in a response error with a **401** http code - Unauthorized 
1. Any request with a non valid token results in a response error with a **401** http code - Unauthorized
1. Any request with a valid token results in a response successfully passes through the Api Gateway

There are many ways to control access to our apis(https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-controlling-access-to-apis.html). For our use case , we selected two modes:

1. Amazon Cognito user pool
2. Lambda Authorizer

## Architecture diagram - Cognito user pool

![Serveless system authentication flow](/images/serverless-system/authentication-flow-cognito.svg) 

For this part , we deployed a new aws resource through Cloudformation : **AWS Cognito user pool**

[Amazon Cognito user pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) are user directories in Amazon Cognito. A client of your API must first sign in a user to the user pool and obtain an identity or access token for the user. Then the client calls your API with one of the returned tokens. The API call succeeds only if the required token is valid.

###  Create a Cognito User pool and an App Client

We need to create a Cognito user pool where we can store our client credentials. Let's update the Cloudformation template:

```
##########################################################################
#                      COGNITO USER POOL                                 # 
##########################################################################

  OrderCognitoPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: orders-pool
      Policies:
        PasswordPolicy:
          MinimumLength: 8
      UsernameAttributes:
        - email
      Schema:
        - AttributeDataType: String
          Name: email
          Required: true

  OrderCognitoPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      UserPoolId: !Ref OrderCognitoPool
      ClientName: order-pool-client
      ExplicitAuthFlows:
        - ALLOW_ADMIN_USER_PASSWORD_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
      GenerateSecret: true
      SupportedIdentityProviders:
        - COGNITO

```
The yaml snippet above creates a Cognito Userpool with username/password authentications. We then create an App Client and App Secret that uses the User Pool.

###  Secure the ApiGateway

Now that we have a User Pool and Client configured, we need to add the authentication to our /orders route in Amazon API Gateway:

```
##########################################################################
#           API GATEWAY                                                  # 
##########################################################################

  OrderApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref ApiGatewayStageName
      Cors:
        AllowMethods: "'POST, GET, UPDATE, DELETE'"
        AllowHeaders: "'X-Forwarded-For'"
        AllowOrigin: "'*'"
        MaxAge: "'600'"
      DefinitionBody:
        'Fn::Transform':
          Name: 'AWS::Include'
          Parameters:
            Location: './api_template.yaml'
      Auth:
        DefaultAuthorizer: MyCognitoAuth
        Authorizers:
          MyCognitoAuth:
            UserPoolArn: !GetAtt OrderCognitoPool.Arn

```
Once you deployed the Sam template, you should have the Cognito user pool created:

![Cognito order pool](/images/serverless-system/cognito-order-pool.png) 

...with the app client:

![Cognito app client](/images/serverless-system/cognito-app-client.png) 

### Create a user in the User Pool

Our apigateway endpoints are now protected, so it can only accepts authenticated requests. To test this asserton , we need to create users and add them in the user pool

The commands below allow us to receive from cognito and set cognito user pool id, app client id and app client secret variables.

```
#Pick the cognito user pool id from the outputs of the cloudformation stack (serverlesssystemstack).
export USER_POOL_ID=`aws cloudformation describe-stacks --stack-name serveerlesssystemstack --region ca-centrla-1 | jq -r '.Stacks[0].Outputs[] | select( .OutputKey | contains("CognitoUserPoolID"))' | jq -r ".OutputValue"`

#Pick the client id from the outputs of the cloudformation stack (serverlesssystemstack).
export CLIENT_ID=`aws cloudformation describe-stacks --stack-name $ORDER_APP --region $AWS_REGION | jq -r '.Stacks[0].Outputs[] | select( .OutputKey | contains("CognitoClientID"))' | jq -r ".OutputValue"`

#Via aws cli , retrieve the client secret in the app client.
export CLIENT_SECRET=`aws cognito-idp describe-user-pool-client --user-pool-id $USER_POOL_ID --client-id $CLIENT_ID  --region $AWS_REGION | jq -r ".UserPoolClient.ClientSecret"`

```

Create Secret Hash from Username, clientid and clientsecret.

```
msg="$USERNAME$CLIENT_ID"
export SECRET_HASH=`echo -n $msg | openssl dgst -sha256 -hmac $CLIENT_SECRET -binary | base64`

```

Then, sign up the Username with its email address and Password by using ClientID and SecretHash.

```
Request :
    aws cognito-idp sign-up \
        --client-id $CLIENT_ID \
        --secret-hash $SECRET_HASH \
        --username $USERNAME \
        --password $PASSWORD \
        --user-attributes Name=email,Value=$USERNAME \
        --region $AWS_REGION
Response:
    {
    "UserConfirmed": false,
    "UserSub": "XXXXXXXXXXXXXX"
}

```

### Cognito Integration test

Now we have created and confirmed a user in Cognito user pool, we can run some tests to make sure the application works as expected.

1. Without token

```
Request:
    curl --location --request POST 'https://xxxxxx.execute-api.ca-central-1.amazonaws.com/Dev/orders/' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "user_id": "Burger_18",
        "quantity": "3",
        "restaurant_id": "Restaurant 4"
    }'
Response:
    {"message":"Unauthorized"} with reeposne http code 401

```

2. With a non valid token

```

Request:
    curl --location --request POST 'https://xxxxxx.execute-api.ca-central-1.amazonaws.com/Dev/orders/' \
    --header 'Authorization: Bearer raWQiOiJaemkr' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "user_id": "Burger_18",
        "quantity": "3",
        "restaurant_id": "Restaurant 4"
    }'
Response:
    {"message":"Unauthorized"} with reeposne http code 401

```

2. With a valid token

In this case , we will make a request to Cognito which will generate a fresh token to use for next request:

```
export IDTOKEN=`aws cognito-idp admin-initiate-auth \
        --user-pool-id $USER_POOL_ID \
        --client-id $CLIENT_ID \
        --auth-flow ADMIN_NO_SRP_AUTH \
        --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD,SECRET_HASH=$SECRET_HASH \
        --region $AWS_REGION \
        | jq -r ".AuthenticationResult.IdToken"`

Request:
    curl --location --request GET 'https://xxxxxx.execute-api.ca-central-1.amazonaws.com/Dev/orders/' \
    --header 'Authorization: $IDTOKEN' \
    --header 'Content-Type: application/json'

Response:  
    [
        {
            "quantity": 2,
            "createdAt": "2021-10-04T08:59:07+0000",
            "user_id": "static_user",
            "orderStatus": "SUCCESS",
            "id": "047e55cddweee9-6415-4t53-bq13",
            "name": "Burger_1",
            "restaurantId": "Restaurant Id"
        }
    ]
```

