const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)

const app = express()
const port = process.env.PORT || 5000

// middleware

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.maovuz9.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    client.connect();
    
    const classesCollection = client.db('sportyZone').collection('classes')
    const instructorsCollection = client.db('sportyZone').collection('instructors')
    const selectedClassesCollection = client.db('sportyZone').collection('selectedClasses')
    const paymentCollection = client.db('sportyZone').collection('payments')
    const enrolledCollection = client.db('sportyZone').collection('enrolled')
    const usersCollection = client.db('sportyZone').collection('users')
    const instructorClassesCollection = client.db('sportyZone').collection('instructorClasses')


    // users
      app.get('/users', async (req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      });
      app.post('/users', async(req, res) => {
          const user = req.body
          const query = {email: user.email}
          const existingUser = await usersCollection.findOne(query);
          if(existingUser){
            return res.send({ message: 'User already exists' })
          }
          const result = await usersCollection.insertOne(user)
          res.send(result)
      })
      app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { admin: user?.role === "admin" }
        res.send(result);
      });

      app.get('/users/instructor/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        const result = { instructor: user?.role === "instructor" }
        res.send(result);
      });

      app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin"
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      });

      app.patch('/users/instructor/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "instructor"
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      });

    // classes
    app.get('/classes', async(req, res) => {
        const result = await classesCollection.find().toArray()
        res.send(result)
    })
    app.post('/classes', async(req, res) => {
      const item = req.body
      const result = await classesCollection.insertOne(item)
      res.send(result)
    })

    // instructor classes
    app.get('/instructorAllClasses', async(req, res) => {
      const result = await instructorClassesCollection.find().toArray()
      res.send(result)
    })
    app.get('/instructorClasses', async(req, res) => {
      const email = req.query.email
      const query = {email: email}
      const result = await instructorClassesCollection.find(query).toArray()
      res.send(result)
    })
        
    app.post('/instructorAllClasses', async(req, res) => {
      const item = req.body
      const result = await instructorClassesCollection.insertOne(item)
      res.send(result)
    })
    app.put('/instructorAllClasses/:id', async(req, res) => {
        const id = req.params.id
        const filter = {_id: new ObjectId(id)}
        const updateStatus= req.body
        const updateDoc = {
            $set:{
                status: updateStatus.status
            }
        }
        const result = await instructorClassesCollection.updateOne(filter, updateDoc)
        res.send(result)
    })
    app.patch('/instructorAllClasses/:id', async(req, res) => {
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const feedback = req.body
      const updateDoc = {
          $set:{
              feedback
          }
      }
      const result = await instructorClassesCollection.updateOne(filter, updateDoc)
      res.send(result)
  })

    // selected classes
    app.get('/selectedClasses', async(req, res) => {
      const email = req.query.email
      const query = {email: email}
      const result = await selectedClassesCollection.find(query).toArray()
      res.send(result)
    })
    app.get('/selectedClasses/:id', async(req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await selectedClassesCollection.findOne(query)
      res.send(result)
    })
    app.post('/selectedClasses', async(req, res) => {
        const item = req.body
        const result = await selectedClassesCollection.insertOne(item)
        res.send(result)
    })
    app.delete('/selectedClasses/:id', async(req, res) => {
        const id = req.params.id
        const query = {_id: new ObjectId(id)}
        const result = await selectedClassesCollection.deleteOne(query)
        res.send(result)
    })
 
    // instructors
    app.get('/instructors', async(req, res) => {
        const result = await instructorsCollection.find().toArray()
        res.send(result)
    })
    app.post('/instructors', async(req, res) => {
        const instructor = req.body
        const result = await instructorsCollection.insertOne(instructor)
        res.send(result)
    })

    // payment
    app.post('/create-payment-intent',  async(req, res) => {
       const { price } = req.body
       const amount = price * 100
       const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    app.post('/payments',  async(req, res) => {
      const payment = req.body
      const id = payment.selectedClass
      const name = payment.className
      const query = {_id : new ObjectId(id)}
      const deleteResult = await selectedClassesCollection.deleteOne(query)
      if (deleteResult.deletedCount === 1) {
        const updateResult = await classesCollection.updateOne(
          { name: name },
          { $inc: { availableSeats: -1 } }
        )
        if (updateResult.modifiedCount === 1) {
          console.log('Available seats updated successfully');
        } else {
          console.log('Failed to update available seats');
        }
      }
      const result = await paymentCollection.insertOne(payment) 
      res.send({result, deleteResult})
    })
    app.get('/payments',  async(req, res) => {
      const email = req.query.email
      const query = {email: email}
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
      res.send(result)
    })

    // my enrolled class
    app.post('/enrolled', async(req, res) => {
        const enrolledItem = req.body
        const result = await enrolledCollection.insertOne(enrolledItem)
        res.send(result)
    })
    app.get('/enrolled', async(req, res) => {
      const email = req.query.email
      const query = {email: email}
      const result = await enrolledCollection.find(query).toArray()
      res.send(result)
    })

 

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.log);










app.get('/', (req, res) => {
  res.send('SportyZone is running')
})

app.listen(port, () => {
  console.log(`SportyZone is running on port ${port}`)
})
