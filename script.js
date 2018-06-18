// I stole this function from here : https://davidwalsh.name/convert-xml-json
function xmlToJson(xml) {
	var obj = {};
	if (xml.nodeType == 1) {
		if (xml.attributes.length > 0) {
		for (var j = 0; j < xml.attributes.length; j++) {
                var attribute = xml.attributes.item(j);
				obj[attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) {
		obj = xml.nodeValue;
	}
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined" && xml.nodeName != "outline") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName]) == "undefined") {
					obj[nodeName] = [];
				}
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

// And that one from there : https://www.sitepoint.com/community/t/convert-plain-text-to-html-with-javascript/271421
function textToHtml(text_input) {
	var output_html=""
	output_html+="<p>"; //begin by creating paragraph
		for(counter=0; counter < text_input.length; counter++){
			switch (text_input[counter]){
				case '\n':
					if (text_input[counter+1]==='\n'){
						output_html+="</p>\n<p>";
						counter++;
					}
					else output_html+="<br>";			
					break;
				case ' ':
					if(text_input[counter-1] != ' ' && text_input[counter-1] != '\t')
						output_html+=" ";														
					break;
				case '\t':
					if(text_input[counter-1] != '\t')
						output_html+=" ";
					break;
				case '&':
					output_html+="&amp;";
					break;
				case '"':
					output_html+="&quot;";
					break;
				case '>':
					output_html+="&gt;";
					break;
				case '<':
					output_html+="&lt;";
					break;
				default:
					output_html+=text_input[counter];
			}
		}
		output_html+="</p>"; //finally close paragraph
		return output_html
}

function feedToOpml(feed) {
	var text = "";
	text += '<?xml version="1.0" encoding="UTF-8"?>\n'
	text += '<opml version="1.1">\n'
	text += '\t<head>\n\t\t<title>\n\t\t\tSoRSSery\n\t\t</title>\n\t</head>\n\t<body>\n'
	for (elem of feed) {
		text += '\t\t<outline title="' + elem.title + '" text="' + elem.title + '">\n'
		for (flux of elem.outline) {
			text += '\t\t\t<outline title="' + flux.title + '" text="' + flux.title + '" type="rss" xmlUrl="' + flux.xmlUrl + '"/>\n'
		}
		text += '\t\t</outline>\n'
	}
	text += '\t</body>\n</opml>\n'
	saveData(text, "sorssery.opml")
}

var saveData = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (data, fileName) {
            blob = new Blob([data], {type: "text/plain;charset=utf-8"}),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

var app = new Vue({
    el: "#app",
    data: {
        page: "feed",
        topics: [],
		selectedTopic: null,
		feed: [],
		slice: 15,
		extended: [],
		newRss: {
			url: "",
			selected: "New topic",
			newTopic: "",
			message: ""
		},
		sources: {
			selected: null
		}
	},
	computed: {
		sourcesTopicSelected: function () {
			if (this.sources.selected && this.topics.find(function (elem) {
				return elem.title === this.selected
			}, this.sources)) {
				var ret = this.topics[this.topics.findIndex(function (elem) {
					return elem.title === this.selected
				}, this.sources)].outline
				return ret
			}
			return []
		},
		news: function() {
			if (this.topics[this.selectedTopic] === undefined) {
				return []
			}
			return this.feed.filter(function(elem) {
				return elem.topic === this.title
			}, this.topics[this.selectedTopic]).map((article) => {
				return {
				...article.data,
				imageL: article.data.image.url?article.data.image.url:article.data.enclosures.length>0?article.data.enclosures[0].url:null,
				dateL: moment( article.data.pubdate).fromNow(),
				URL: article.url,
				extended: this.extended.indexOf(article.id)>=0?true:false,
				key: article.id,
				textL: (!article.data['media:group'] || !article.data['media:group']['media:description'] || !article.data['media:group']['media:description']['#'])?"":textToHtml(article.data['media:group']['media:description']['#']),
				author: article.data.author?article.data.author:article.title,
				authorL: article.title
			}}).sort((a, b) => new Date(b.pubdate) - new Date(a.pubdate)).slice(0, this.slice)
		}
	},
    methods: {
		lastUpdate: function(topic) {
			if (!this.topics || this.topics === []) {
				return null
			}
			var ret = this.feed.filter(function(elem) {
				return elem.topic === this.title
			}, this.topics[topic]).map((article) => {
				return {
				...article.data,
				dateL: moment( article.data.pubdate).fromNow()
			}}).sort((a, b) => new Date(b.pubdate) - new Date(a.pubdate)).slice(0, 1)
			if (ret.length > 0) {
				return ret[0].dateL
			}
			return null
		},
		removeRss: function(url, topicName) {
			var topic = this.topics.findIndex(function(elem) {
				return elem.title===this.topic
			}, {topic: topicName})
			var index = this.topics[topic].outline.findIndex(function(elem) {
				return elem.xmlUrl===this.url
			}, {url: url})
			this.topics[topic].outline.splice(index, 1)
			localStorage.setItem('topics', JSON.stringify(this.topics));
		},
		addRss: function() {
			var topic = this.newRss.selected
			if (this.newRss.selected==="New topic") {
				topic = this.newRss.newTopic
				if (!this.newRss.newTopic || this.newRss.newTopic === "") {
					return this.newRss.message = "You need to provide a name for the new topic."
				}
				if (!this.topics.find(function(elem) {
					return elem.title === this.newTopic
				}, this.newRss)) {
					this.topics.push({title: this.newRss.newTopic, text: this.newRss.newTopic, outline:[]})
				}
			}
			topic = this.topics.findIndex(function(elem) {
				return elem.title === this.topic
			}, {topic: topic})
			if (!this.newRss.url || this.newRss.url === "") {
				return this.newRss.message = "You need to provide a url."
			}
			if (this.topics[topic].outline.find(function (elem) {
				return elem.xmlUrl === this.url
			}, this.newRss)) {
				return this.newRss.message = "The feed is already saved."
			}
			feednami.load(this.newRss.url,function(result){
				if(result.error) {
					console.log(result.error);
					console.log(this.newRss.url);
					return this.newRss.message = "The provided url could not be fetched properly."
				} else {
					this.topics[topic].outline.push({'title': result.feed.meta.title, 'text': result.title, 'type': "rss", 'xmlUrl': this.newRss.url})
					localStorage.setItem('topics', JSON.stringify(this.topics));
					return this.newRss.message = "Added feed source : " + result.feed.meta.title
				}
			}.bind(this));
		},
		extend: function(key) {
			var index = this.extended.indexOf(key)
			if (index < 0) {
				this.extended.push(key)
			}
			else {
				this.extended.splice(index, 1)
			}
		},
		scroll: function(key, screen) {
			var elmnt = document.getElementById("feed");
			if (screen) {
				var elmnt = document.getElementById(screen);
			}
			switch (key) {
				case 'up':
					elmnt.scrollTop = elmnt.scrollTop - 40
					return
				case 'down':
					elmnt.scrollTop = elmnt.scrollTop + 40
					return
				case 'pageup':
					elmnt.scrollTop = elmnt.scrollTop - 1000
					return
				case 'pagedown':
					elmnt.scrollTop = elmnt.scrollTop + 1000
					return
				case 'bottom':
					elmnt.scrollTop = elmnt.scrollHeight
					return
				case 'top':
					elmnt.scrollTop = 0
					return
				case 'check':
					if (elmnt.scrollTop >= elmnt.scrollHeight - 1000 && this.slice < this.feed.filter(function(elem) {
						return elem.topic === this.title
					}, this.topics[this.selectedTopic]).length){
						this.slice = this.slice + 15
					}
					return
				default:
					break;
			}
		},
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
			  this.prepareFeed()
            }.bind(this);
            reader.readAsText(file);
        },
        changePage: function(page) {
            this.page = this.page==="feed"?"settings":"feed";
        },
        changeTopic: function(topic) {
			var elmnt = document.getElementById("feed");
			elmnt.scrollTop = 0
			this.selectedTopic = topic;
			this.slice = 15
			this.extended = []
		},
		prepareFeed: function() {
			if (!this.topics || !this.topics.length>0) {
				this.selectedTopic = null
				this.feed = []
				return
			}
			this.selectedTopic = 0
		},
		fetchFeed: function() {
			for (var topic of this.topics) {
				for (elem of topic.outline) {
					this.fetchRss(elem.xmlUrl, elem.title, topic.title)
				}
			}
		},
		fetchRss: function(url, title, topic) {
			feednami.load(url,function(result){
				if(result.error) {
					console.log(result.error);
					console.log(url);
				} else {
					var entries = result.feed.entries;
					for(var i = 0; i < entries.length; i++){
						var entry = entries[i];
						this.test = entry.title;
						if (!this.diff(entry.title, entry.url)) {
							this.feed.push({id: this.feed.length,topic: topic, url: url, title: title, data: entry})
						}
					}
				}
			}.bind(this));
		},
		diff: function(title, url) {
			for (elem of this.feed) {
				if (elem.data.title===title && elem.data.url===url) {
					return true
				}
			}
			return false
		},
		saveOPML: function() {
			return feedToOpml(this.topics)
		}
    },
    mounted: function(){
		this.topics=localStorage.topics?JSON.parse(localStorage.topics):[]
		this.prepareFeed()
		this.fetchFeed()
		this.scroll('top', 'settings')
		this.scroll('top')
    }
});
