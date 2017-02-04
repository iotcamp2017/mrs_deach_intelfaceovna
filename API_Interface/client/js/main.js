(function ($) {
    "use strict";

    
jQuery(document).ready(function($){
	
	
	// one page nav
	$('#nav').onePageNav({
	    currentClass: 'current',
	    changeHash: true,
	    scrollSpeed: 1500,
	    scrollThreshold: 0.5,
	    filter: ':not(.external)',
	    easing: 'swing',
	    begin: function() {
	        //I get fired when the animation is starting
	    },
	    end: function() {
	        //I get fired when the animation is ending
	    },
	    scrollChange: function(jQuerycurrentListItem) {
	        //I get fired when you enter a section and I pass the list item of the section
	    }
	});
    
    $(".navbar-toggle").on("click", function(){
        $(".navbar-nav").addClass("mobile_menu");
    });
    $(".navbar-nav li a").on("click", function(){
        $(".navbar-collapse").removeClass("in");
    });

	// end of one page nav
	


	//jQuery for page scrolling feature - requires jQuery Easing plugin
    $('a.page-scroll').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1000);
        event.preventDefault();
    });
    

	// Owl Carousel for main slider
    $('.main_slide_owl').owlCarousel({
        loop:false,
        autoplay:true,
        animateOut: 'fadeOut',
    	animateIn: 'fadeIn',
        dots:false,
        responsive:{
            0:{
                items:1
            },
            400:{
                items:1
            },
            600:{
                items:1
            },
            992:{
                items:1
            }
        }
    });


    // start our services carousel

    $('.services-carousel').owlCarousel({
		loop:true,
		autoplay:true,
		margin:150,
		nav:true,
		navText: ["<i class='fa fa-angle-left'></i>","<i class='fa fa-angle-right'></i>"],
		responsive:{
			0:{
				items:1
			},
			600:{
				items:3
			},
			1000:{
				items:3
			},
            1200:{
                items:4
            }
		}
	});

    // end our services carousel

    // jQuery Lightbox
    $('.lightbox').venobox({
        numeratio: true,
        infinigall: true
    });
    
    // jQuery MixItUp
    $('.work_all_item').mixItUp();

	$('#optgroup').multiSelect({ selectableOptgroup: true });

	var yabs_inited = false;
	var start_pos = null;
	
	$('#yabs-logo').on('mouseover', function(e){
		e.preventDefault();
		
		var wdth = $(this).outerWidth(),
			hght = ($(this).outerHeight()+28);
		
		if(!yabs_inited){
			
			var pos = $(this).position();
			start_pos = pos;
			
			$(this).css('position', 'absolute').css('left', pos.left).css('top', pos.top).css('transition', 'all .5s');
			$(this).after('<div style="height:1px; margin-top:'+hght+'px; width:1px;"> </div>');
			
			$(this).css('position', 'absolute').css('left', pos.left).css('top', pos.top);
			
			yabs_inited = true;
			
			//$('#yabs-logo').trigger('mouseover');
			
			//return;
		}
		
		var rand_left = (Math.random()*($(window).width() - wdth)) - ($(window).width() - wdth)/2 + start_pos.left;
		
		$(this).css('left', rand_left + 'px')/*.css('top', pos.top)*/;
		
		return false;
		
	});
	
	$('#yabs-logo').on('click', function(e){
		if(confirm('Вы хотите перейти на страницу YabsLabs?') &&
		   confirm('Вы точно хотите перейти на страницу YabsLabs?') &&
		   confirm('Вы точно-точно хотите перейти на страницу YabsLabs?') &&
		   confirm('Вы уверены?') &&
		   confirm('Подождите... Вы отдаёте контроль своим действиям?') &&
		   confirm('Вот сейчас прям сто проц?'))
			window.location = 'https://www.google.ru/?q=yabs%20labs%20%D0%BF%D0%BB%D0%B0%D1%82%D0%BD%D0%BE%20%D1%81%20%D1%80%D0%B5%D0%BA%D0%BB%D0%B0%D0%BC%D0%BE%D0%B9%20%D1%81%D0%BC%D0%BE%D1%82%D1%80%D0%B5%D1%82%D1%8C%20%D0%BE%D1%84%D1%84%D0%BB%D0%B0%D0%B9%D0%BD%20%D1%81%20%D1%81%D0%BC%D1%81';
		else{
			e.preventDefault();
			return false;
		}
	});
    
    
    
    /*socket.on('', function(msg) {
        if(msg.value === false) {
            $('#messages').prepend($('<li>Toogle LED: OFF<span> - '+msg.userId+'</span></li>'));
            $("#led-container").removeClass("on");
            $("#led-container").addClass("off");
            $("#led-container span").text("OFF");
        }
        else if(msg.value === true) {
            $('#messages').prepend($('<li>Toogle LED: ON<span> - '+msg.userId+'</span></li>'));
            $("#led-container").removeClass("off");
            $("#led-container").addClass("on");
            $("#led-container span").text("ON");
        }
    });*/
	
});
    
    var socket = io();
    
    $('#eriks_mode').on('change', function(){
        console.log($(this).val());
        
        socket.emit('set mode', $(this).val());
    });
	

})(jQuery);