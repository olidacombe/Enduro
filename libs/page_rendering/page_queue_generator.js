// * ———————————————————————————————————————————————————————— * //
// * 	enduro render
// *	renders individual page based on source template, context and culture
// * ———————————————————————————————————————————————————————— * //
var page_queue_generator = function () {}

// vendor dependencies
var Promise = require('bluebird')
var glob = require('glob-promise')
var path = require('path')

// local dependencies
var babel = require(ENDURO_FOLDER + '/libs/babel/babel')
var flat_file_handler = require(ENDURO_FOLDER + '/libs/flat_utilities/flat_file_handler')

// Renders individual files
page_queue_generator.prototype.generate_pagelist = function () {

	var self = this

	return new Promise(function (resolve, reject) {

		// Reads config file and gets cultures
		babel.get_cultures()
			.then((cultures) => {

				// save current cultures
				config.cultures = cultures

				// gets all the pages
				return self.get_all_pages()
			})
			.then((files) => {

				var all_pages_to_render = []
				var pages_to_render = []

				// iterates over files and fill all_pages_to_render list
				for (f in files) {
					for (c in config.cultures) {

						var page_to_render = {}

						// absolute path to page template file
						page_to_render.file = files[f]

						// relative, 'flat' path to cms file
						page_to_render.context_file = self.get_page_url_from_full_path(files[f])

						// culture string
						page_to_render.culture = config.cultures[c]

						// destination path
						page_to_render.destination_path = page_to_render.context_file

						// true if page is generator
						page_to_render.generator = flat_file_handler.is_generator(page_to_render.context_file)

						// push to pages to render list
						all_pages_to_render.push(page_to_render)
					}
				}

				var generators = []

				for (i in all_pages_to_render) {
					if (all_pages_to_render[i].generator) {
						generators.push(self.add_generator_pages(pages_to_render, all_pages_to_render[i]))
					} else {
						pages_to_render.push(all_pages_to_render[i])
					}
				}

				return Promise.all(generators)
					.then(() => {
						resolve(pages_to_render)
					})

			})
	})
}

// generate list of pages that needs to be generated by generator
page_queue_generator.prototype.add_generator_pages = function (pages_to_render, page_context) {

	// fetch all context files from folder of the same name as the template name
	return glob(path.join(CMD_FOLDER, 'cms', page_context.context_file, '**/*.js'))
	.then((files) => {

		// iterate found context files and add them to the provided list
		for (f in files) {

			// clone the generator object
			context_clone = JSON.parse(JSON.stringify(page_context))

			// path to new context file
			context_clone.context_file = flat_file_handler.get_cms_filename_from_fullpath(files[f])

			// sets new destination path, removing the /generator from the path
			context_clone.destination_path =
			context_clone.destination_path = flat_file_handler.url_from_filename(context_clone.context_file)

			// push to provided page list
			pages_to_render.push(context_clone)
		}

	})
}

page_queue_generator.prototype.get_all_pages = function () {
	return glob(CMD_FOLDER + '/pages/**/*.hbs')
}

page_queue_generator.prototype.get_page_url_from_full_path = function (full_path) {
	return full_path.match(/pages\/(.*)\.([^\\/]+)$/)[1]
}

module.exports = new page_queue_generator()
