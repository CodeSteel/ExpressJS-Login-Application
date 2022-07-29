const mysql = require('mysql');
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const config = require('./config');
const mail = require('./mail');
var key;
var iv;

function InitializeData() {
    connection = mysql.createConnection(config.mysql);
    connection.connect(function(err) {
        if (err) throw err;
    });   
    // create account table
    connection.query(`CREATE TABLE IF NOT EXISTS accounts (
        id int(11) NOT NULL AUTO_INCREMENT,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        emailiv TEXT NOT NULL,
        passwordiv TEXT NOT NULL,
        passwordresettoken TEXT,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;`);

    connection.query(`CREATE TABLE IF NOT EXISTS config (keysetting varchar(100) NOT NULL, value TEXT NOT NULL, PRIMARY KEY (keysetting));`);

    connection.query(`SELECT * FROM config WHERE keysetting = 'crypto_key'`, function(err, result) {
        if (err) throw err;
        if (result.length == 0) {
            key = crypto.randomBytes(32);
            connection.query(`INSERT INTO config (keysetting, value) VALUES ('crypto_key', '` + key.toString('hex') + `')`);
            console.log("Crypto key saved to database.");
        } else {
            key = Buffer.from(result[0].value, 'hex');
            console.log("Crypto key loaded from database.");
        }
    });

    connection.query("SELECT * FROM config WHERE keysetting = 'crypto_iv'", function(err, result) {
        if (err) throw err;
        if (result.length == 0) {
            iv = crypto.randomBytes(16);
            connection.query(`INSERT INTO config (keysetting, value) VALUES ('crypto_iv', '` + iv.toString('hex') + `')`);
            console.log("Crypto IV saved to database.");
        } else {
            iv = Buffer.from(result[0].value, 'hex');
            console.log("Crypto IV loaded from database.");
        }
    });

    console.log("Database Initialized!");
}

function FetchAccount(username, password, callback) {
    let query = "";
    
    if (password == "") {
        if (IsEmail(username)) {
            let eEmail = Encrypt(username);
            query = `SELECT * FROM accounts where email = '` + eEmail.encryptedData + `' AND emailiv = '` + eEmail.iv + `'`;
        } else {
            query = `SELECT * FROM accounts where username = '` + username + `'`;
        }

        connection.query(query, function(err, results) {
            if (err) throw err;
            callback(results);
        });
        return;
    }

    let ePass = Encrypt(password);
    
    if (IsEmail(username)) {
        let eEmail = Encrypt(username);
        query = `SELECT * FROM accounts where email = '` + eEmail.encryptedData + `' AND emailiv = '` + eEmail.iv + `' AND password = '` + ePass.encryptedData + `' AND passwordiv = '` + ePass.iv + `'`;
    } else {
        query = `SELECT * FROM accounts where username = '` + username + `' AND password = '` + ePass.encryptedData + `' AND passwordiv = '` + ePass.iv + `'`;
    }

    connection.query(query, function(err, results) {
        if (err) throw err;
        callback(results);
    });
}

function FetchAccountByToken(token, callback) {
    let query = `SELECT * FROM accounts WHERE passwordresettoken = '` + token + `'`;
    connection.query(query, function(err, results) {
        if (err) throw err;
        callback(results);
    });
}

function UpdatePassword(token, password, callback) {
    FetchAccountByToken(token, function(results) {
        if (results.length == 0) {
            return;
        }

        let ePassword = Encrypt(password);
        let query = `UPDATE accounts SET password = '` + ePassword.encryptedData + `', passwordiv = '` + ePassword.iv + `', passwordresettoken = '' WHERE passwordresettoken = '` + token + `'`;
        connection.query(query, function(err, results) {
            if (err) {
                callback(false);
                throw err;
            }

            callback(true);
        });
    }
    );
}

function CreateAccount(email, username, password) {
    let eEmail = Encrypt(email);
    let pass = Encrypt(password);

    connection.query('INSERT INTO accounts (email, username, password, emailiv, passwordiv) VALUES (?, ?, ?, ?, ?)', [eEmail.encryptedData, username, pass.encryptedData, eEmail.iv, pass.iv], function(err, results) {
        if (err) throw err;
    });
}

function ResetPassword(email, callback) {
    FetchAccount(email, "", function(results) {
        if (results.length == 0) {
            callback(false);
            return;
        }
        let token = crypto.randomBytes(16).toString('hex');
        let eEmail = Encrypt(email);
        let query = `UPDATE accounts SET passwordresettoken = '` + token + `' WHERE email = '` + eEmail.encryptedData + `'`;
        connection.query(query, function(err, results) {
            if (err) throw err;

            mail.SendMail(email, "Reset Password", "Hi there!\nClick the link below to reset your password: " + config.server + "/resetpassword/" + token);
            callback(token);
        });
    });
}

function Encrypt(data) {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// function Decrypt(iv, data) {
//     let ivhex = Buffer.from(iv, 'hex');
//     let encryptedText = Buffer.from(data, 'hex');
//     let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), ivhex);
//     let decrypted = decipher.update(encryptedText);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
//     return decrypted.toString();
// }

function GetAllUsers(callback) {
    connection.query('SELECT username FROM accounts', function(err, results) {
        if (err) throw err;
        callback(results);
    });
}

function IsEmail(email)
{
    let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (email.match(regexEmail)) {
        return true; 
    } else {
        return false; 
    }
}

module.exports = {
    InitializeData: InitializeData,
    FetchAccount: FetchAccount,
    CreateAccount: CreateAccount,
    ResetPassword: ResetPassword,
    FetchAccountByToken: FetchAccountByToken,
    UpdatePassword: UpdatePassword,
    GetAllUsers: GetAllUsers
}