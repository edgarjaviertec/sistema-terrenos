(function () {
    document.documentElement.style.visibility = 'hidden';

    fetch('/.netlify/functions/auth-verificar-cliente')
        .then(r => {
            if (r.status === 401) {
                window.location.replace('/login');
            } else {
                document.documentElement.style.visibility = '';
            }
        })
        .catch(() => {
            document.documentElement.style.visibility = '';
        });
})();
