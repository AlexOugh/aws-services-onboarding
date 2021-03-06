
exports.handler = (event, context, callback) => {
  // we've got all outputs of the parallel actions, so merge results to the first action's output
  var cloudtrailResult= false;
  if(event[0].cloudtrail.result != null){
    var cloudtrailResultBody = JSON.parse(event[0].cloudtrail.result.body);
    cloudtrailResult = cloudtrailResultBody.result;
  }
  event[0].final_result.cloudtrail[event[0].cloudtrail.body.region] = cloudtrailResult;
  var awsconfigResult = JSON.parse(event[1].awsconfig.result.body);
  event[0].final_result.awsconfig[event[0].awsconfig.body.region] = awsconfigResult.result;
  var awseventsResult = JSON.stringify(event[0].awsevents.result);
  event[0].final_result.awsevents[event[0].awsevents.body.region] = awseventsResult;
  callback(null, event[0]);
};
