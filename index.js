const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

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

    // classes
    app.get('/classes', async(req, res) => {
        const result = await classesCollection.find().toArray()
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
