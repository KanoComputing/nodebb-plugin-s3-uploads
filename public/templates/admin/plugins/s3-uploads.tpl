<h1><i class="fa fa-picture-o"></i> S3 Uploads Configuration</h1>
<hr />

<p>You can configure this plugin via a combination of the below, for instance, you can use <em>instance meta-data</em> and <em>environment variables</em> in combination. You can also specify values in the form below, and those will be stored in the database.</p>

<h3>Environment Variables</h3>
<pre><code>export AWS_ACCESS_KEY_ID="xxxxx"
export AWS_SECRET_ACCESS_KEY="yyyyy"
export S3_UPLOADS_BUCKET="zzzz"
</code></pre>

<h3>Instance meta-data</h3>
<p>This plugin is compatible with the instance meta-data API, you'll need to setup role delegation for this to work. See the following links:</p>
<ul>
  <li><a href="http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html">EC2 Documentation: Instance Metadata and User Data</a></li>
  <li><a href="http://docs.aws.amazon.com/IAM/latest/UserGuide/roles-assume-role.html">IAM Documentation: Assuming a Role</a></li>
  <li><a href="http://docs.aws.amazon.com/IAM/latest/UserGuide/role-usecase-ec2app.html">IAM Documentation: EC2 Role Example</a></li>
  <li><a href="http://docs.aws.amazon.com/STS/latest/UsingSTS/sts_delegate.html">STS Documentation: Delegation</a></li>
</ul>
<div class="alert alert-warning">
  <p>If you need help, create an <a href="https://github.com/KanoComputing/nodebb-plugin-s3-uploads/issues/">issue on Github</a>.</p>
</div>

<h3>Database Stored configuration:</h3>
<form id="s3-upload-bucket">
  <label for="bucket">Bucket</label><br />
  <input type="text" name="bucket" value="{bucket}" title="S3 Bucket" class="form-control input-lg" placeholder="S3 Bucket"><br />
  <button class="btn btn-primary" type="submit">Save</button>
</form>

<br><br>
<form id="s3-upload-credentials">
  <label for="bucket">Credentials</label><br />
  <div class="alert alert-warning">
    Configuring this plugin using the fields below is <strong>NOT recommended</strong>, as it can be a potential security issue. We highly recommend that you investigate using either <strong>Environment Variables</strong> or <strong>Instance Meta-data</strong>
  </div>
  <input type="text" name="accessKeyId" value="{accessKeyId}" maxlength="20" title="Access Key ID" class="form-control input-lg" placeholder="Access Key ID"><br />
  <input type="text" name="secretAccessKey" value="{secretAccessKey}" title="Secret Access Key" class="form-control input-lg" placeholder="Secret Access Key"><br />
  <button class="btn btn-primary" type="submit">Save</button>
</form>

<script>
  $("#s3-upload-bucket").on("submit", function(e){
    e.preventDefault();
    save("bucket", this);
  });

  $("#s3-upload-credentials").on("submit", function(e){
    e.preventDefault();
    var form = this;
    bootbox.confirm("Are you sure you wish to store your credentials for accessing S3 in the database?", function(confirm) {
      if (confirm) {
        save("credentials", form);
      }
    });
  });

  function save(type, form){
    var data = {
      _csrf : $('#csrf_token').val()
    };

    var values = $(form).serializeArray();
    for(var i=0, l=values.length; i<l; i++){
      data[values[i].name] = values[i].value;
    }

    $.post('/api/admin/plugins/s3-uploads/' + type, data).done(function(response){
      if(response){
        app.alertSuccess(response);
      }
    }).fail(function(jqXHR, textStatus, errorThrown) {
      app.alertError(jqXHR.responseJSON ? jqXHR.responseJSON.error : 'Error saving!');
    });
  }
</script>
