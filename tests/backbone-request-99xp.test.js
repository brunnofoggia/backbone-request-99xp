import bbr from '../lib/backbone-request-99xp.esm.js';
import _ from 'underscore-99xp';
import v8n from 'v8n-99xp';


var Model = bbr.Model.extend({
    urlRoot: 'https://tapi.99xp.org/crud/test'
});
var id = null;

it('create row', () => {
    expect.assertions(1);

    var model = new Model({name: 'new person', age: 10});

    return model.savep((m, o) => {
        id = m.get('id');
        expect(m.get('name') === 'new person' && m.get('age') === 99 && m.get('id')).toBe(true);
    });
});


it('get row', () => {
    expect.assertions(1);

    var model = new Model({
            id: id
        });


    return model.fetchp((m, o) => {
        expect(m.get('name') === 'new person').toBe(true);
    });
});

it('change row', () => {
    expect.assertions(2);

    var model = new Model({id: id});

    return model.fetchp((m, o) => {
        // m.once('sync', ()=>{
        expect(m.get('name') === 'new person' && m.get('age')+'' === '10' && m.get('id')+'' === id+'').toBe(true);
        m.set('name', 'old person');
        m.set('age', 50);


        m.once('sync', ()=>{
            expect(m.get('name') === 'old person' && m.get('age')+'' === '50' && m.get('id')+'' === id+'').toBe(true);
        });
        m.save();
/*
        m.once('sync', ()=>{
            expect(m.get('name') === 'old person' && m.get('age')+'' === '50' && m.get('id')+'' === id+'').toBe(true);
            resolve();
        });
        m.save();
*/
/*
        m.savep().then((m, res, req, o) => {
            expect(m.get('name') === 'old person' && m.get('age')+'' === '50' && m.get('id')+'' === id+'').toBe(true);
            console.log('2 call');
            resolve();
        });
*/
    });
});

// implementar promise pra delete
it('detroy row', () => {
    expect.assertions(1);

    var model = new Model({
            id: id
        });

    return model.destroyp(_.partial((m, o) => {
        expect(true).toBe(true);
    }, model));
});


