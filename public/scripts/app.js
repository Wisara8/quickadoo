$(() => {
  validateForm();

  activateBtns.activateCopyBtn();
  activateBtns.activateDeleteBtn();



  // let editable = false;
  // $('input[value="PREVIEW"]').click(function (e) {
  //   e.preventDefault();

  //   // remove all default icons
  //   $(".material-icons").toggle();
  //   // display checkbox
  //   $(".right-icon input").toggle();
  //   // display vote counter
  //   $("#counter").toggle();
  //   // display thumbs up icon
  //   $(".fas.fa-thumbs-up").toggle();

  //   $('input[value="SUBMIT"]').slideToggle("fast");
  //   if (editable === false) {
  //     $('.form-control').attr('readonly', true);
  //     editable = true;
  //   } else {
  //     $('.form-control').attr('readonly', false);
  //     editable = false;
  //   };
  // })






  $('#event-form').on('submit', function (event) {
    event.preventDefault();
    const formFields = $(this).serializeArray();

    function objectifyForm(formArray) {//serialize data function
      const optionFields = ['name', 'start_time', 'end_time', 'note'];
      var returnArray = {};
      let optionNum = 0;

      for (let i = 0; i < formArray.length; i++) {
        const name = formArray[i].name;
        const value = formArray[i].value;

        const optionIndex = optionFields.indexOf(name);
        if (optionIndex !== -1) {
          if (optionIndex === 0) optionNum++;
          returnArray[`${name}-${optionNum}`] = value;
        } else {
          returnArray[name] = value;
        }
      }
      return returnArray;
    }

    const formJSON = JSON.stringify(objectifyForm(formFields));

    $.ajax({
      url: '/events',
      method: 'POST',
      data: formJSON,
      dataType: 'json'
    })
  })

  let editable = false;

  $('input[value="PREVIEW"]').click(function (e) {
    e.preventDefault();
    $(".material-icons").toggle();
    $(".left-icon").toggle();
    $(".fas.fa-thumbs-up").toggle();
    $("#counter").toggle();
    $(".right-icon input").toggle();
    $('input[value="CREATE"]').slideToggle("slow");
    if (editable === false) {
      $('.form-control').attr('readonly', true);
      editable = true;
    } else {
      $('.form-control').attr('readonly', false);
      editable = false;
    };
  })


});
