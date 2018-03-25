'use strict'

const hafas = require('vbb-hafas')

const monitor = require('.')

const alexanderplatz = '900000100003'
const stations = [alexanderplatz] // array of station ids
const interval = 2 * 60 * 1000 // every two minutes

const departures = monitor(hafas, stations, interval)
.on('error', console.error)
.on('data', console.log)
.on('stats', console.error)

setTimeout(() => {
	departures.stop() // stop querying
}, interval * 30)
