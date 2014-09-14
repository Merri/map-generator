The Settlers II.net Map Generator
=================================

Generates random maps for [The Settlers II](http://settlers2.net/) and [Return to the Roots](http://www.rttr.info/).

This project is running at http://settlers2.net/map-generator/

See the [TODO list](https://github.com/Merri/map-generator/wiki) @ wiki.


Setting up development environment
----------------------------------

Just clone to your preferred git project location. You need Node and a local webserver to serve the `public/index.html` file (you can also just open the file in browser, but accessing images has cross-origin protection so map render features are more limited).

To get started with development itself:

	npm install

After running this you should have the dev environment running and be able to run continuous preprocessing by typing `npm start`. JavaScript is processed on the fly into `public/bundle.js`. Once you're done you should do `npm run build` to compile the production version.