const { promisify } = require('util')

const mongoose = require('mongoose')
const AWS = require('aws-sdk')
const uuid = require('node-uuid')
const authenticate = require('mm-authenticate')(mongoose)
const { Team, Script } = require('mm-schemas')(mongoose)
const { send, buffer } = require('micro')

mongoose.connect(process.env.MONGO_URL)
mongoose.Promise = global.Promise

const s3 = new AWS.S3({
  params: { Bucket: 'mechmania' }
})

const getObject = promisify(s3.getObject.bind(s3))

module.exports = authenticate(async (req, res) => {
  const urlParams = req.url.split('/')
  if(urlParams.length !== 2) {
    return send(res, 400, 'Malformed URL')
  }
  const [_, name] = urlParams

  // Find team
  const team = await Team.findOne({name}).populate('latestScript').exec()

  if(!team) {
    return send(res, 404, `Team ${name} not found`)
  }
  if(!team.latestScript) {
    return send(res, 404, `No script uploaded for ${name}`)
  }
  if(!team.latestScript.canBeAccessedBy(req.user)) {
    return send(res, 401, 'Unauthorized')
  }

  // Get file from s3
  const data = await getObject({Bucket: 'mechmania', Key: team.latestScript.key})

  send(res, 200, data.Body)
})