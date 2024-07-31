
// /*
// --endpoints--
// / -> GET -> returns all users
// /signin -> POST -> SUCCESS/FAIL
// /register -> POST -> RETURN NEW CREATED USER, NEW USER OBJECT
// /profile/:id -> GET -> returns user profile
// /image -> PUT -> updates user entries
// */
import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex';

// const db = knex({
//     client: 'pg',
//     connection: {
//         host: '127.0.0.1',
//         port: 5432,
//         user: 'kabirsharma',
//         password: '',
//         database: 'smart-brain',
//     },
// });
const db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

db.select('*').from('users').then(data => {
    console.log(data);
});

const app = express();

app.use(bodyParser.json());
app.use(cors({
    origin: 'https://smart-eye-api-production.up.railway.app'
  }));

const database = {
    users: [
        {
            id: '123',
            name: 'John',
            email: 'john@gmail.com',
            password: bcrypt.hashSync('cookies'),
            entries: 0,
            joined: new Date()
        },
        {
            id: '124',
            name: 'Sally',
            email: 'sally@gmail.com',
            password: 'bananas',
            entries: 5,
            joined: new Date()
        }
    ],
    login: [
        {
            id: '987',
        }
    ]
};

app.get('/', (req, res) => {
    res.send(database.users);
});

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    console.log('Signin attempt for email:', email);

    if (!email || !password) {
        return res.status(400).json('incorrect form submission');
    }

    db.select('email', 'hash')
      .from('login')
      .where(function() {
          this.where('email', '=', email)
              .orWhere('email', '=', JSON.stringify({email}))
      })
      .then(data => {
          console.log('Login data found:', data.length > 0);
          if (data.length) {
              const isValid = bcrypt.compareSync(password, data[0].hash);
              console.log('Password valid:', isValid);
              if (isValid) {
                  return db.select('*')
                           .from('users')
                           .where(function() {
                               this.where('email', '=', email)
                                   .orWhere('email', '=', JSON.stringify({email}))
                           })
                           .then(user => {
                               console.log('User found:', user.length > 0);
                               if (user.length) {
                                   res.json(user[0]);
                               } else {
                                   res.status(400).json('User not found');
                               }
                           })
                           .catch(err => {
                               console.error('Error fetching user:', err);
                               res.status(500).json('Server error');
                           });
              } else {
                  res.status(400).json('wrong credentials');
              }
          } else {
              res.status(400).json('wrong credentials');
          }
      })
      .catch(err => {
          console.error('Database error:', err);
          res.status(500).json('Server error');
      });
});


app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
  
    if (!email || !name || !password) {
      return res.status(400).json('Incorrect form submission');
    }
  
    const hash = bcrypt.hashSync(password);
  
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
        .into('login')
        .returning('email')
        .then(loginEmail => {
          return trx('users')
            .returning('*')
            .insert({
              email: loginEmail[0],
              name: name,
              joined: new Date()
            })
            .then(user => {
              res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
      .catch(err => res.status(400).json('Unable to register'));
  });

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where({ id })
        .then(user => {
            if (user.length) {
                res.json(user[0]);
            } else {
                res.status(400).json('not found');
            }
        })
        .catch(err => res.status(400).json('error getting user'));
});

app.put('/image', (req, res) => {
    const { id } = req.body;
  
    if (!id) {
      return res.status(400).json('Invalid request');
    }
  
    db('users')
      .where('id', '=', id)
      .increment('entries', 1)
      .returning('entries')
      .then(entries => {
        if (entries.length) {
          res.json(entries[0]);
        } else {
          res.status(400).json('User not found');
        }
      })
      .catch(err => res.status(400).json('Unable to get entries'));
  });

// app.listen(3001, () => {
//     console.log('app is running on port 3001!');
// });

const port = process.env.PORT || 3001;
   app.listen(port, () => {
       console.log(`app is running on port ${port}!`);
   });
/*
--endpoints--
/ -> GET -> returns all users
/signin -> POST -> SUCCESS/FAIL
/register -> POST -> RETURN NEW CREATED USER, NEW USER OBJECT
/profile/:id -> GET -> returns user profile
/image -> PUT -> updates user entries
*/
