// I stole this function from here : https://davidwalsh.name/convert-xml-json
function xmlToJson(xml) {
	var obj = {};
	if (xml.nodeType == 1) {
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
		for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) {
		obj = xml.nodeValue;
	}
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};

function fetchRss(url) {
    var url = 'http://feeds.feedburner.com/raymondcamdensblog?format=xml';
	
	feednami.load(url,function(result){
		if(result.error) {
			console.log(result.error);
		} else {
			var entries = result.feed.entries;
			for(var i = 0; i < entries.length; i++){
				var entry = entries[i];
				console.dir(entry);
			}
		}
	});
}

var app = new Vue({
    el: "#app",
    data: {
        page: "feed",
        topics: [],
        selectedTopic: null,
    },
    methods: {
        readSingleFile: function(e) {
            var file = e.target.files[0];
            if (!file) {
              return;
            }
            var reader = new FileReader();
            reader.onload = function(e) {
              var contents = e.target.result;
              parser = new DOMParser();
              xmlDoc = parser.parseFromString(contents, "text/xml");
              this.topics = xmlToJson(xmlDoc).opml.body.outline
              localStorage.setItem('topics', JSON.stringify(this.topics));
              console.log(JSON.stringify(xmlToJson(xmlDoc).opml.body.outline[0]["@attributes"]));
            }.bind(this);
            reader.readAsText(file);
        },
        changePage: function(page) {
            this.page = this.page==="feed"?"settings":"feed"
        },
        changeTopic: function(topic) {
            this.selectedTopic = topic
        }
    },
    beforeMount: function(){
        this.topics=localStorage.topics?JSON.parse(localStorage.topics):[]
        this.selectedTopic = this.topics && this.topics.length > 0 ? 0 : null
        fetchRss()
    }
});