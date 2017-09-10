'use strict'

const {Readable} = require('stream')
const hafas = require('vbb-hafas')
const createAvgWindow = require('live-moving-average')

const monitor = (stations, interval, step, client) => {
	if (!stations || stations.length === 0) {
		throw new Error('At least one station must be passed.')
	}
	interval = interval || 60 * 1000
	step = step || Math.min(Math.floor(interval / stations.length), 100)
	client = client || hafas // allow mocking
	const duration = Math.ceil(interval / 60 / 1000)

	const avgDuration = createAvgWindow(5, 0)
	let reqs = 0, departures = 0
	const fetch = (client, id, duration, out) => () => {
		const start = Date.now()
		reqs++

		const when = new Date(start + 60 * 1000)
		client.departures(id, {when, duration})
		.then((deps) => {
			avgDuration.push(Date.now() - start)
			departures += deps.length

			for (let dep of deps) out.push(dep)

			out.emit('stats', {
				reqs, departures, avgDuration: avgDuration.get()
			})
		})
		.catch(err => out.emit('error', err))
	}

	const intervals = {} // by station id
	const timeouts = {} // by station id, used in the beginning

	const stop = () => {
		for (let id in timeouts) clearTimeout(timeouts[id])
		for (let id in intervals) clearInterval(intervals[id])
	}

	const out = new Readable({objectMode: true})
	out._read = () => {}
	out.stop = () => {
		stop()
		out.emit('end')
		out.emit('close')
	}

	const manual = out.manual = (id) => {
		fetch(client, id, duration, out)()
	}

	stations.forEach((id, i) => {
		timeouts[id] = setTimeout(() => {
			const cb = fetch(client, id, duration, out)
			intervals[id] = setInterval(cb, interval)
			cb()
		}, i * step)
	})

	return out
}

module.exports = monitor
