const regForm = document.getElementById('register-form')

regForm.addEventListener('submit', function(event) {
    event.preventDefault()
    const newReg = event.target.firstElementChild.value;
    let registerForm;
    if (newReg !== '') {
        registerForm = {title: newReg}

        fetch('localhost:3000/register', {
            method: 'POST',
            body: JSON.stringify(newReg),
            headers: {'Content-Type': 'application/json; charset=UTF-8'}
        }).then(res => console.log(res.json()));

    }
});




