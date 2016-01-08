Yolande Agent
======================

Yolande Agent Utility. Provides environment-compartmentalized operations and inquiries, upon requests received from SQS subscription, and returns results to be processed across the same.


#### Pre-requisites

Ensure you have `node` and `npm` installed.
An active AWS SQS service must be available.

#### Configuration
AWS Authentication

  - SQS
	- SQS_ENDPOINT : The SQS Endpoint to point to.
	- SQS_REGION : The AWS Region the default communication is routed through.
	- SQS_USERID : The AWS User the service Authenticates with.
	- SQS_ACCESSKEY : Credentials, access key.
	- SQS_SECRETKEY : Credentials, secret.
	- SQS_QUEUE : Primary listen queue for application.

#### Making requests to the application
View API at 
`host/config`
To view connection details.
 
```
Requests are of the format:
{
    QueueUrl: ENDPOINT/USERID/QUEUE,
    MessageBody: payload,
    MessageAttributes: {
        operation: {
            DataType: 'String',
            StringValue: OPERATIONNAME
        },
        respondTo: {
            DataType: 'String',
            StringValue: RESPONSEQUEUE
        }
    }
}
```

Where operation is a plugin to call and responsequeue is the queue that your application is listening to.

Please note that if you create a new Queue, you will need to grant permissions to the UserId of this Agent app.

#### Running the application

To run the app in dev environment, execute

```
$ ./bin/www
```

or

```
$ node server.js
```

Command above will launch express in cluster mode if your development machine has more than 1 cpu/core. If you want to run in non-cluster mode, use the following commands

```
$ ./bin/www --standalone
```

or

```
$ node server.js --standalone
```

To start the app in any other environment, set NODE_ENV environment valiable to one of ```test```, ```int``` or ```prod```

#### Files

##### build.sh

```build.sh``` file will be used for bundling the application when the build runs. Prime build-deploy pipeline expects a versioned artifact to be deployed on the servers, which is produced by this script. Make changes to the script to include all files that needs to be deployed on the server.

##### install.sh

```install.sh``` file will be executed on the server to setup the project. For example, running ```npm install``` or ```bower install``` should be done here. E3 prime will make sure the instance that runs a node app has ```node, npm and bower```. 

