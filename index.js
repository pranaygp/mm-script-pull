const { promisify } = require('util')

const mongoose = require('mongoose')
const AWS = require('aws-sdk')
const uuid = require('node-uuid')
const { Team, Script } = require('mm-schemas')(mongoose)
const { send, buffer } = require('micro')

mongoose.connect(process.env.MONGO_URL)
mongoose.Promise = global.Promise

const s3 = new AWS.S3({
  params: { Bucket: 'mechmania' }
})

const getObject = promisify(s3.getObject.bind(s3))

module.exports = async (req, res) => {
  const urlParams = req.url.split('/')
  if(urlParams.length !== 2) {
    send(res, 400, 'Malformed URL')
    return
  }
  const [_, name] = urlParams

  // Find team
  const team = await Team.findOne({name}).populate('latestScript').exec()

  if(!team) {
    send(res, 404, `Team ${name} not found`)
    return;
  }
  if(!team.latestScript) {
    send(res, 404, `No script uploaded for ${name}`)
  }

  // Get file from s3
  const data = await getObject({Bucket: 'mechmania', Key: team.latestScript.key})

  send(res, 200, data.Body)
}