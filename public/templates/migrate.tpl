<div class="clearfix">
  <h1 class="pull-left"><i class="fa fa-picture-o"></i> S3 Uploads Migrator</h1>
  <a class="btn btn-primary pull-right" style="margin-top:20px;" href="/admin/plugins/s3-uploads">Configuration</a>
</div>
<hr />

<div class="alert alert-warning">
  <strong>IMPORTANT:</strong> Make sure you've configured S3 Uploads before clicking "Migrate", as otherwise this will fail.<br>
  <strong>RECOMMENDED:</strong> Back up your database before doing this.
</div>

<button id="s3-uploads-migrator" class="btn btn-primary" type="submit">Migrate</button>

<div class="modal fade" id="confirm-modal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        <h4 class="modal-title">Confirm Migration</h4>
      </div>
      <div class="modal-body">
        By clicking continue, you acknowledge that this will find all the images in your database that are stored locally, upload them to S3, rewrite the references in the database, and then delete the local copy of the images.  
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary">Continue</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="results-modal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        <h4 class="modal-title">Migration Results</h4>
      </div>
      <div class="modal-body">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" data-dismiss="modal">Okay</button>
      </div>
    </div>
  </div>
</div>



<script type="text/javascript">
  var confirmCancelBtn = $("#confirm-modal .btn-default");
  var confirmContinueBtn = $("#confirm-modal .btn-primary");
  $("#s3-uploads-migrator").on("click", function(e){
    e.preventDefault();
    confirmContinueBtn.text("Continue").attr("disabled", false);
    confirmCancelBtn.show();
    $('#confirm-modal').modal('show');
  });

  confirmContinueBtn.on("click", function(e){
    e.preventDefault();

    confirmContinueBtn.text("Working…").attr("disabled", true);
    confirmCancelBtn.hide();

    $.post("/api/admin/plugins/s3-uploads/migrate", {_csrf : $('#csrf_token').val()}).done(function(response){
      if(response.err){
        return app.alertError(response.err);
      }

      $("#results-modal").find(".modal-body").html(response.results);
      $('#results-modal').modal('show');
    }).fail(function(response){
      app.alertError(response.statusText);
    }).always(function(){
      $('#confirm-modal').modal('hide');
    });
  })
</script>
