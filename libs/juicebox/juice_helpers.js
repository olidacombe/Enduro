// * ———————————————————————————————————————————————————————— * //
// * 	juice helpers
// *	TODO: nicer logging
// * ———————————————————————————————————————————————————————— * //
var juice_helpers = function () {}

// vendor dependencies
var dircompare = require('dir-compare')
var path = require('path')
var fs = require('fs-extra')
var moment = require('moment')
var glob = require('glob-promise')

// local dependencies
var logger = require(ENDURO_FOLDER + '/libs/logger')
var enduro_helpers = require(ENDURO_FOLDER + '/libs/flat_utilities/enduro_helpers')
var juice_diff = require(ENDURO_FOLDER + '/libs/juicebox/juice_diff')
var flat_file_handler = require(ENDURO_FOLDER + '/libs/flat_utilities/flat_file_handler')

juice_helpers.prototype.diff_folder_with_cms = function (folder) {
	// local path
	var path1 = path.join(CMD_FOLDER, 'cms')

	// juice path
	var path2 = path.join(CMD_FOLDER, folder)

	return juice_diff.diff(path1, path2)
}

juice_helpers.prototype.diff_file_with_cms = function (juicebox_hash, file) {
	glob(path.join(CMD_FOLDER, 'juicebox', 'staging', juicebox_hash, '**', file + '.js'))
		.then((file) => {
			if (!file.length) {
				return logger.err('no such file')
			}

			if (file.length > 1) {
				console.log(file)
				return logger.err('More than one file')
			}

			// get paths for both files
			var staging_file_to_diff = file[0]
			var current_file_to_diff = flat_file_handler.get_full_path_to_cms(staging_file_to_diff.match(/\/cms\/(.*)/)[1]).replace('.js.js', '.js')

			const spawn = require('child_process').exec

			spawn('diff "' + staging_file_to_diff + '" "' + current_file_to_diff + '"', [], function (err, stdout, stderr) {
				if (err) { logger.err(err) } // handled error

				console.log(stdout)
			})

			spawn.stdout.on('data', function (data) {
				console.log('stdout: ' + data)
			})
		})

}

juice_helpers.prototype.spill_newer = function (folder) {
	return new Promise(function (resolve, reject) {

		if (!enduro_helpers.dir_exists_sync(folder)) {
			return resolve()
		}

		diff = get_diff(folder)

		copy_stack = []

		diff.diffSet.forEach(function (entry) {

			if (entry.type1 != 'directory') {
				// remote is newer
				if (entry.date2 > entry.date1) {
					logger.twolog('newer in juicebar', entry.name2)
					copy_stack.push(copy_file_to_cms(entry))
				}

				// only on remote
				if (entry.state == 'right') {
					logger.twolog('new file in juicebar', entry.name2)
					copy_stack.push(copy_file_to_cms(entry))
				}
			}
		})

		Promise.all(copy_stack)
			.then(() => {
				resolve()
			})
	})
}

// * ———————————————————————————————————————————————————————— * //
// *	nice_log
// * 	logs latest juiceboxes
// *
// *	@param juice {object} - fetched juice.json
// *	@param maxrows {int} - maximum number of rows logged. defaults to 20.
// *	returns nothing - just logs out stuff
// * ———————————————————————————————————————————————————————— * //
juice_helpers.prototype.nice_log = function (juice, maxrows) {

	var history_length = juice.history.length
	maxrows = Math.min(maxrows | 20, history_length)

	logger.init('Juice log')
	logger.log('latest')
	log_record(juice.latest)
	logger.line()

	for (var i = 0; i < maxrows; i++) {
		log_record(juice.history[history_length - i - 1])
	}
	logger.end()
}

// * ———————————————————————————————————————————————————————— * //
// *	log_record
// * 	logs one record
// *
// *	@param record {object} - object with a record. {hash:'', user: '', timestamp: ''}
// *	returns nothing - just logs out stuff
// * ———————————————————————————————————————————————————————— * //
function log_record (record) {
	logger.twolog(record.hash.match(/_(.*)/)[1] + ' (' + record.user + ')', moment.unix(record.timestamp).fromNow())
}

function get_diff (folder) {
	var path1 = path.join(CMD_FOLDER, 'cms')
	var path2 = path.join(CMD_FOLDER, folder, 'cms')
	return dircompare.compareSync(path1, path2, {compareSize: true})
}

function copy_file_to_cms (entry) {
	return new Promise(function (resolve, reject) {

		var from_path = path.join(entry.path2, entry.name2)
		var to_path = path.join(CMD_FOLDER, 'cms', path.join(entry.path2, entry.name2).match(/\/cms\/(.*)/)[1])

		fs.copy(from_path, to_path, {preserveTimestamps: true}, () => {
			resolve()
		})
	})
}

module.exports = new juice_helpers()
