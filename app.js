const express = require('express');
const path = require('path');
const { Client } = require('pg');
const dbConfig = require('./config');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: '*', // Tüm kökenlere izin verir
    // veya belirli bir kökeni belirleyebilirsiniz:
    // origin: 'http://185.92.1.239:7878'
  }));
const PORT = 7878;

// postgreSQL istemcisi oluştur
const client = new Client(dbConfig);
client.connect();

const droptablehesaplar = `DROP TABLE IF EXISTS hesaplar ` ;
const createhesaplartablequery = `CREATE TABLE IF NOT EXISTS hesaplar
(
    id SERIAL PRIMARY KEY,
    hesap_kodu character varying(255) COLLATE pg_catalog."default" NOT NULL,
    hesap_adi character varying(255) COLLATE pg_catalog."default" NOT NULL,
    tipi character(255) COLLATE pg_catalog."default" NOT NULL,
    ust_hesap_id integer,
    borc numeric,
    alacak numeric,
    borc_sistem numeric,
    alacak_sistem numeric,
    borc_doviz numeric,
    alacak_doviz numeric,
    borc_islem_doviz numeric,
    alacak_islem_doviz numeric,
    birim_adi character varying(255) COLLATE pg_catalog."default",
    bakiye_sekli integer,
    aktif boolean,
    dovizkod integer
    )

TABLESPACE pg_default;

ALTER TABLE IF EXISTS hesaplar
    OWNER to burakdemir;` ;


const droptableusers = `DROP TABLE IF EXISTS users` ;
const createuserstablequery = `
CREATE TABLE IF NOT EXISTS users
(
    id integer NOT NULL,
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    password character varying(255) COLLATE pg_catalog."default" NOT NULL
    
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS users
    OWNER to burakdemir;` ;

    const createuser = `INSERT INTO public.users (id, username, password) VALUES (1,'admin','admin')` ;

    


    client.query (droptablehesaplar);
    client.query (droptableusers);
    client.query (createhesaplartablequery) ;
    client.query (createuserstablequery) ;
    client.query (createuser) ;
const axios = require('axios');
const https = require('https');

const agent = new https.Agent({  
  rejectUnauthorized: false // https doğrulamasını iptal etmek için
});
let data = JSON.stringify({});

function upddatabase() {axios.post('https://efatura.etrsoft.com/fmi/data/v1/databases/testdb/sessions',data, { httpsAgent: agent,  
    headers:  { 
    'Content-Type': 'application/json', 
    'Authorization': 'Basic YXBpdGVzdDp0ZXN0MTIz'
  } })
.then((response) => {

    let data2 = {
      "fieldData": {},
      "script": "getData"
    };
    
    let url = 'https://efatura.etrsoft.com/fmi/data/v1/databases/testdb/layouts/testdb/records/1';
    
    let headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + response.data.response.token
    };
    
    // PATCH isteği gönderme
    axios.patch(url, data2, { headers: headers, httpsAgent : agent })
      .then((response) => {
      
        
        try {
            const jsonData = JSON.parse(response.data.response.scriptResult) ;
    
            client.query(
                `TRUNCATE hesaplar RESTART IDENTITY;` 
            )
            for (var item of jsonData) {
               console.log(item) 
               if (!item.hesap_kodu) {
                    console.error('Eksik veya geçersiz hesap_kodu değeri bulundu:', item);
                    continue;
                } 
                
                 client.query(`
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
        }
    })
      .catch((error) => {
        console.log(error);
      });
    })
.catch((error) => {
  console.log(error);
});

}


// milisaniye olarak çalışır kontrol için 1 dakikalık ayarladım 10 dakika için "1" yerine "10" yazılması yeterlidir
const interval = 1* 60 * 1000;



setInterval(upddatabase, interval);

// ilk çağrıyı hemen yapmak için setimmediate kullanıyoruz
setImmediate(upddatabase);

// JSON ve URL-encoded verileri işlemek için middleware ekleyin yani request ve response için gerekli
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// public klasörünü statik olarak kullan
app.use(express.static(path.join(__dirname, 'public')));

app.delete('/api/remove-duplicates', async (req, res) => {
    try {
        await client.query(`
            DELETE FROM hesaplar
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM hesaplar
                GROUP BY hesap_kodu
            );
        `);
        res.send('Tekrar eden veriler başarıyla silindi.');
    } catch (err) {
        console.error('Tekrar eden veriler silinirken bir hata oluştu:', err);
        res.status(500).send('Sunucu hatası');
    }
});

// giriş için POST isteği
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Kullanıcı adı ve şifre gereklidir.');
    }

    try {
        // Veritabanında kullanıcıyı doğrula users tablom
        const result = await client.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);

        if (result.rows.length > 0) {
            res.json({ message: 'Giriş başarılı',success : true });
        } else {
            res.json({ message: 'Geçersiz kullanıcı adı veya şifre',success : false });

        }
    } catch (err) {
        console.error('Giriş işlemi sırasında bir hata oluştu:', err);
        res.status(500).send('Sunucu hatası');
    }
});

app.get('/api/data', async (req, res) => {
    try {
      const result = await client.query(`
        SELECT 
    hesap_kodu,
    hesap_adi,
    tipi,
    ust_hesap_id,
    borc,
    alacak,
    (borc - alacak) as bakiye,
    seviye
FROM (
    -- Hesap Gruplarını ve Toplamlarını Seç
    SELECT 
        hg.grup_kodu as hesap_kodu,
        hg.grup_adi as hesap_adi,
        'G' as tipi,
        NULL::integer as ust_hesap_id,
        ht.toplam_borc as borc,
        ht.toplam_alacak as alacak,
        0 as seviye
    FROM (
        SELECT DISTINCT 
            LEFT(hesap_kodu, 3) as grup_kodu,
            LEFT(hesap_kodu, 3) || ' HESAP GRUBU' as grup_adi
        FROM hesaplar
    ) hg
    LEFT JOIN (
        SELECT 
            LEFT(hesap_kodu, 3) as grup_kodu,
            SUM(CASE WHEN tipi = 'A' THEN borc ELSE 0 END) as toplam_borc,
            SUM(CASE WHEN tipi = 'A' THEN alacak ELSE 0 END) as toplam_alacak
        FROM hesaplar
        GROUP BY LEFT(hesap_kodu, 3)
    ) ht ON hg.grup_kodu = ht.grup_kodu

    UNION ALL

    -- Gerçek Hesap Kayıtlarını Seç
    SELECT 
        hesap_kodu,
        hesap_adi,
        tipi,
        ust_hesap_id,
        borc,
        alacak,
        CASE 
            WHEN tipi = 'A' THEN 1
            ELSE 2
        END as seviye
    FROM hesaplar
) as birlesik_veriler
ORDER BY 
    LEFT(hesap_kodu, 3),
    seviye,
    hesap_kodu;
      `);

      
      res.json(result.rows);
    } catch (error) {
      console.error('Veri getirme hatası:', error.message);
      res.status(500).json({ error: 'Veri getirme hatası' });
    }
  });
  
  app.get('/api/data-all', async (req, res) => {
    try {
      const result = await client.query(`
        SELECT * FROM hesaplar
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Veri getirme hatası:', error.message);
      res.status(500).json({ error: 'Veri getirme hatası' });
    }
  });
  
app.get('/api/data', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM hesaplar ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Veriler alınırken bir hata oluştu:', err);
        res.status(500).send('Sunucu hatası');
    }
});



// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});
