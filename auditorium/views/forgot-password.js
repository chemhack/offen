var html = require('choo/html')

module.exports = view

function view (state, emit) {
  function handleSubmit (e) {
    e.preventDefault()
    var formData = new window.FormData(e.currentTarget)
    emit('offen:forgot-password', {
      emailAddress: formData.get('email-address'),
      urlTemplate: window.location.origin + '/reset-password/{token}/'
    })
  }
  var form = html`
    <div class="w-100 pa3 mb2 br2 bg-black-05">
      <h4 class="f5 normal mt0 mb3">Request link to reset password</h4>
      <form class="mw6 center" onsubmit=${handleSubmit}>
        <label class="b lh-copy">
          ${__('Email address')}
        </label>
        <input class="w-100 pa2 mb3 input-reset ba b--black-10 bg-white" required type="email" name="email-address">
        <input class="w-100 w-auto-ns f5 link dim bn ph3 pv2 mb3 dib br1 white bg-dark-green" type="submit" value="${__('Send Email')}">
    </form>
  `

  return form
}
