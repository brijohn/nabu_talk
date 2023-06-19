console.log("Custom Slides JS");
Reveal.addEventListener('fragmentshown', function(event) {
	console.log(event.fragment);
	if (event.fragment.hasAttribute('data-hide-fragment')) {
		frag_index = event.fragment.attributes['data-hide-fragment'].value;
		frag = document.querySelector(`section.present > .r-stack > .fragment[data-fragment-index="${frag_index}"]`);
		frag.style.visibility="hidden";
		console.log("Hiding Index: " + frag_index);
	}
});
Reveal.addEventListener('fragmenthidden', function(event) {
	if (event.fragment.hasAttribute('data-hide-fragment')) {
		frag_index = event.fragment.attributes['data-hide-fragment'].value;
		frag = document.querySelector(`section.present > .r-stack > .fragment[data-fragment-index="${frag_index}"]`);
		frag.style.visibility="visible";
		console.log("Show Index: " + frag_index);
	}
});

