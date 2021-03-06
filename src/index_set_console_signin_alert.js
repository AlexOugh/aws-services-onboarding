exports.handler = function(event,context) {
    
    var accountInfo = event;

    if(accountInfo.accountType.toLowerCase() === 'managed') {

        var aws = require("aws-sdk");
	var uuid = require('node-uuid');
	var id = uuid.v4();
    	var aws_topic = new(require('aws-services-lib/aws/topic.js'))();
    	var cloudwatchevents = new(require('aws-services-lib/aws/cloudwatchevents.js'))();
    	var AccountId = accountInfo.customerAccount;
    	var region = accountInfo.body.region;
    	var snsPolicy = '{"Sid":"Allow_Publish_Events_'+id+'","Effect":"Allow","Principal":{"Service":"events.amazonaws.com"},"Action":"sns:Publish","Resource":"arn:aws:sns:'+region+':'+AccountId+':ConsoleSignInAlertTopic"}';

	var creds = new aws.Credentials({
		accessKeyId: accountInfo.Credentials.AccessKeyId,
    		secretAccessKey: accountInfo.Credentials.SecretAccessKey,
    		sessionToken: accountInfo.Credentials.SessionToken 
  	}); 

    	var input = {
        	topicName:"ConsoleSignInAlertTopic",
        	ruleName: "ConsoleLoginAlertRule",
        	ruleDescription: "Alert on Console Login",
        	eventPattern:'{"detail-type":["AWS Console Sign In via CloudTrail"]}',
        	ruleState:"ENABLED",
        	targetId: id,
        	emailAddress : process.env.NotificationEmail,
        	AccountId: AccountId,
        	region: region,
    		roleArn: null,
        	topicArn: null,
		creds: creds
    	};
    
    	function succeeded(input) {
		context.done(null,true);
    	}
    	function failed(input) {
        	context.done(null,false);
    	}
    	function errored(err) {
        	context.fail(err, null);
    	}

    	function appendPolicy (input) {
          var topicPolicy = JSON.parse(input.attributes.Policy);
          var policy = JSON.parse(snsPolicy);
          topicPolicy.Statement.push(policy);
          var strPolicy = JSON.stringify(topicPolicy);
      	  console.log(strPolicy);         
      	  input.AttributeValue = strPolicy;
          aws_topic.setTopicAttributes(input);
    	}
  
    	var flows = [
        	{func:aws_topic.findTopic, success:aws_topic.subscribeEmail, failure:aws_topic.createTopic, error:errored},
        	{func:aws_topic.createTopic, success:aws_topic.subscribeEmail, failure:failed, error:errored},
        	{func:aws_topic.subscribeEmail, success:cloudwatchevents.createRule, failure:failed, error:errored},
        	{func:cloudwatchevents.createRule, success:cloudwatchevents.createTarget, failure:failed, error:errored},
        	{func:cloudwatchevents.createTarget, success:aws_topic.getTopicAttributes, failure:failed, error:errored},
        	{func:aws_topic.getTopicAttributes, success:appendPolicy, failure: failed, error: errored},
        	{func:appendPolicy, success:aws_topic.setTopicAttributes,failure: failed, error:errored},
        	{func:aws_topic.setTopicAttributes, success:succeeded, error:errored}
        
    	];

    	aws_topic.flows = flows;
    	cloudwatchevents.flows = flows;
    	flows[0].func(input);
    }
};
