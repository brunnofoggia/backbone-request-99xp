import bbr from './lib/backbone-request-99xp.esm.js';
import _ from 'underscore-99xp';
import v8n from 'v8n-99xp';

(()=>{
	var Model = bbr.Model.extend({
		urlRoot: 'https://tapi.99xp.org/crud/test'
	}),
	model = new Model({id: 35});
	// var json = { name: 'bruno', age: 29 }


	model.once('sync', ()=>{
		console.log('-- api > get');
		console.log(model.attributes);
	});
	model.fetch();
})();

(()=>{
	var Model = bbr.Model.extend({
		urlRoot: 'https://tapi.99xp.org/crud/test'
	}),
	model = new Model({name: 'eva', age: 99});


	model.once('sync', ()=>{
		console.log('-- api > post');
		console.log(model.attributes)
	});
	model.save();
})();

(()=>{
	var Model = bbr.Model.extend({
		urlRoot: 'https://tapi.99xp.org/crud/test'
	}),
	model = new Model({id: 76});

	model.once('sync', ()=>{
		try {

		console.log('-- api > put');
		console.log('before', model.attributes);
		model.set('name', 'wall-e '+_.random(10,99));
		console.log('after', model.attributes);
		model.once('sync', ()=>console.log(model.attributes));
		model.save();
		} catch(e) {
			console.error(e);
		}
	});
	model.fetch();
})();