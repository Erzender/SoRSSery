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

/*
[ "title", "description", "summary", 
"date", "pubdate", "pubDate", "link", "guid", "author", "comments", 
"origlink", "image", "source", "categories", "enclosures", 
"atom:@", "atom:id", "yt:videoid", "yt:channelid", "atom:title", 
"atom:link", "atom:author", "atom:published", "atom:updated", 
"media:group", "pubdate_ms", "date_ms" ]
*/

var app = new Vue({
    el: "#app",
    data: {
        page: "feed",
        topics: [],
		selectedTopic: null,
		feed: [],
		slice: 15,
		extended: []
	},
	computed: {
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
				textL: (!article.data['media:group'] || !article.data['media:group']['media:description'] || !article.data['media:group']['media:description']['#'])?"":textToHtml(article.data['media:group']['media:description']['#'])
			}}).sort((a, b) => new Date(b.pubdate) - new Date(a.pubdate)).slice(0, this.slice)
		}
	},
    methods: {
		extend: function(key) {
			var index = this.extended.indexOf(key)
			if (index < 0) {
				this.extended.push(key)
			}
			else {
				this.extended.splice(index, 1)
			}
		},
		scroll: function(key) {
			var elmnt = document.getElementById("feed");
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
				if (topic.outline.title) {
					this.fetchRss(topic.outline.xmlUrl, topic.title)
				} else {
					for (elem of topic.outline) {
						this.fetchRss(elem.xmlUrl, topic.title)
					}
				}
			}
		},
		fetchRss: function(url, title) {
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
							this.feed.push({id: this.feed.length,topic: title, url: url, data: entry})
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
		}
    },
    mounted: function(){
		this.topics=localStorage.topics?JSON.parse(localStorage.topics):[]
		this.prepareFeed()
		this.fetchFeed()
        //fetchRss()
    }
});
