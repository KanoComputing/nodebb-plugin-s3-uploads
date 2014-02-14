# NodeBB S3 Uploads Plugin

| Dependency     | Version Requirement     |
| -------------- |:-----------------------:|
| NodeBB Version | >= 0.3.2 or [a909a253](https://github.com/designcreateplay/NodeBB/commit/a909a253931c20427c14c777c1bb6629a79d449d) |

A plugin for NodeBB to take file uploads and store them on S3, uses the `filter:uploadImage` hook in NodeBB. 


## S3 Uploads Configuration


You can configure this plugin via a combination of the below, for instance, you can use **instance meta-data** and **environment variables** in combination. You can also configure via the NodeBB Admin panel, which will result in the Bucket and Credentials being stored in the NodeBB Database.

If you decide to use the Database storage for Credentials, then they will take precedence over both Environment Variables and Instance Meta-data, the full load order is:

1. Database
2. Environment Variables
3. Instance Meta-data

For instance, for [talk.kano.me](http://talk.kano.me), we store the Bucket name in an Environment Variable, and the Credentials are discovered automatically with the Security Token Service.

### Environment Variables

```
export AWS_ACCESS_KEY_ID="xxxxx"
export AWS_SECRET_ACCESS_KEY="yyyyy"
export S3_UPLOADS_BUCKET="zzzz"
```

### Instance Meta-data

To use Instance Meta-data, you'll need to setup role delegation, see the following links for more information:

* [EC2 Documentation: Instance Metadata and User Data](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html)
* [IAM Documentation: Assuming a Role](http://docs.aws.amazon.com/IAM/latest/UserGuide/roles-assume-role.html)
* [IAM Documentation: EC2 Role Example](http://docs.aws.amazon.com/IAM/latest/UserGuide/role-usecase-ec2app.html)
* [STS Documentation: Delegation](http://docs.aws.amazon.com/STS/latest/UsingSTS/sts_delegate.html)

**NOTE:** You'll need to pass in the `Bucket` as either an **Environment Variable** or as a **Database Backed Variable**.

If you need help, create an [issue on Github](https://github.com/KanoComputing/nodebb-plugin-s3-uploads/issues/), and @miksago will try to help you out.

### Database Backed Variables

From the NodeBB Admin panel, you can configure the following settings to be stored in the Database:

* `bucket` — The S3 bucket to upload into
* `accessKeyId` — The AWS Access Key Id
* `secretAccessKey` — The AWS Secret Access Key

**NOTE: Storing your AWS Credentials in the database is bad practice, and you really shouldn't do it.** We highly recommend investigating using either **Environment Variables** or **Instance Meta-data** instead.

## Caveats

* Currently all uploads are stored in S3 keyed by a UUID and file extension, as such, if a user uploads multiple avatars, all versions will still exist in S3. This is a known issue and may require some sort of cron job to scan for old uploads that are no longer referenced in order for those objects to be deleted from S3.
