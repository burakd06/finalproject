const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// postgreSQL db içe aktar
const dbConfig = require('./config');   


// postgreSQL cleientini oluştur
const client = new Client(dbConfig);    

// JSON dosya yolu
const jsonFilePath = path.join(__dirname, 'data.json');   

fs.readFile(jsonFilePath, 'utf8', async (err, data) => {  
    if (err) {
        console.error('Dosya okunurken bir hata oluştu:', err);
        return;
    }
    try {
        const jsonData = JSON.parse(JSON.parse(data) ) ;
       // JSON.parse(JSON.parse(data) ) ; iç içe yapma sebebim ilk tırnağı ayırmaması


        // postgreSQL client bağlantısı
        await client.connect();  

        for (var item of jsonData) {
           console.log(item) 
           if (!item.hesap_kodu) {
                console.error('Eksik veya geçersiz hesap_kodu değeri bulundu:', item);
                continue;
            } 
            
            await client.query(`
               INSERT INTO hesaplar (
                    id, hesap_kodu, hesap_adi, tipi, ust_hesap_id, borc, alacak,
                    borc_sistem, alacak_sistem, borc_doviz, alacak_doviz,
                    borc_islem_doviz, alacak_islem_doviz, birim_adi, bakiye_sekli, aktif, dovizkod
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `, [
                item.id || 0, item.hesap_kodu || null, item.hesap_adi || null, item.tipi || null, item.ust_hesap_id || 0, item.borc || 0, item.alacak || 0,
                item.borc_sistem || 0, item.alacak_sistem || 0, item.borc_doviz || 0, item.alacak_doviz || 0,
                item.borc_islem_doviz || 0, item.alacak_islem_doviz || 0 , item.birim_adi || null, item.bakiye_sekli || 0, item.aktif || 0, item.dovizkod || 0
            ]); 
        } 
 

        
        console.log('Veriler başarıyla PostgreSQL tablosuna aktarıldı.');

    } catch (parseError) {
        console.error('JSON parse işlemi sırasında bir hata oluştu:', parseError);
    } finally {
        // postgreSQL clientini kapat
        await client.end();  
    }
});
