
document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Giriş başarılı olduğunda, veri panelini göster
            document.querySelector('.login-container').classList.add('hidden');
            document.querySelector('.data-container').classList.remove('hidden');
            dataloadstart(); // Verileri yükle
        } else {
            // Hata mesajını göster
            document.getElementById('login-error').classList.remove('hidden');
        }
    })
    .catch(error => console.error('Giriş yapılırken bir hata oluştu:', error));
});

function dataloadstart() {
    fetchData(); // Veri çekme fonksiyonu
    setInterval(fetchData, 600000); // 10 dakikada bir verileri güncelle
}

function fetchData() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('data-table').querySelector('tbody');
            tbody.innerHTML = ''; // Mevcut verileri temizle

            // Yeni verileri tabloya ekle
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.hesap_kodu}</td>
                    <td>${item.hesap_adi}</td>
                    <td>${item.tipi}</td>
                    <td>${item.ust_hesap_id}</td>
                    <td>${item.borc}</td>
                    <td>${item.alacak}</td>
                    <td>${item.aktif}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Veriler alınırken bir hata oluştu:', error));
}