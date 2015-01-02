var _ = require('underscore')._
	, utils = require('./utils')
  , Person = require('./person');


module.exports = {
	people: {},

	identify: function(nsp, socket, username, userType, appVersion, meData) {
    var person = this.people[username];
    if (typeof person === 'undefined') {
      person = new Person(username, userType, meData);
      this.people[username] = person;
    }

    // console.info('identified as '+username);
    person.connect(socket, appVersion);
	},

	disconnect: function(nsp, socket) {
    person = this.findPersonBySocket(socket, this.people);
    if (typeof person !== 'undefined') {
      // console.info('disconnected '+person.username);

      if (person.getViewedCase(socket)) {
      	this.stopViewingCase(nsp, socket, person.getViewedCase(socket));
      }

      person.disconnect(socket);

      if (person.canBeDeleted()) {
        // console.info('deleting '+person.username);
        delete this.people[person.username];
      }
    }
	},

	startViewingCase: function(nsp, socket, caseref) {
    person = this.findPersonBySocket(socket, this.people);
    if (typeof person !== 'undefined') {
      // console.info(person.username+' started viewing case '+caseref);
      person.startViewingCase(socket, caseref);


      utils.sendToAllClientsInChannel(nsp, caseref, 'peopleViewing', this.getPeopleViewingCase(caseref));
    }
	},

	stopViewingCase: function(nsp, socket, caseref) {
    person = this.findPersonBySocket(socket, this.people);
    if (typeof person !== 'undefined') {
      // console.info(person.username+' stopped viewing case '+caseref);
      person.stopViewingCase(socket, caseref);

      utils.sendToAllClientsInChannel(nsp, caseref, 'peopleViewing', this.getPeopleViewingCase(caseref));
    }
	},

  execIfClaSuperuser: function(socket, callback) {
    person = this.findPersonBySocket(socket, this.people);
    if (typeof person !== 'undefined' && person.is_cla_superuser) {
      callback(person);
    }
  },

  sendDOMChanges: function(nsp, socket, data) {
    person = this.findPersonBySocket(socket, this.people);
    if (typeof person !== 'undefined') {
      utils.sendToAllClientsInChannel(nsp, 'mirror', 'mirror', data);
    }
  },

  startViewingDOM: function(nsp, socket) {
    this.execIfClaSuperuser(socket, function(person) {
      person.startViewingDOM(socket);
    });
  },

  stopViewingDOM: function(nsp, socket) {
    this.execIfClaSuperuser(socket, function(person) {
      person.stopViewingDOM(socket);
    });
  },

	getPeopleViewingCase: function(caseref) {
		var peopleViewing = [];

		_.each(_.values(this.people), function(person) {
			if (person.getAllViewedCase().indexOf(caseref) > -1) {
				peopleViewing.push(person.username);
			}
		});

		return peopleViewing;
	},

	findPersonBySocket: function(socket) {
		return _.find(_.values(this.people), function(person) {
			return person.ownsSocket(socket);
		})
	},

  getPeopleCount: function() {
    return _.size(this.people);
  },

  getVersionCounts: function() {
    var appVersions = [];

    _.each(_.values(this.people), function(person) {
      appVersions = appVersions.concat(person.getAllAppVersions());
    });
    return _.countBy(appVersions);
  }
};
