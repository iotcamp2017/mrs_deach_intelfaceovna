$(document).ready(function(){
    setInterval(function(){
        $.getJSON('/getPointsGraph', function(dots){
            
            var dataDef = { title: "fourier transformation",
                            xLabel: 'frequency', 
                            yLabel: 'magnitude',
                            labelFont: '19pt Arial', 
                            dataPointFont: '10pt Arial',
                            renderTypes: [CanvasChart.renderType.lines, CanvasChart.renderType.points],
                            dataPoints: dots,
                            xSkip: 6,
                            ySkip: 4
                          };
            CanvasChart.render('canvas', dataDef);
            
            var hits_per_second = $.getJSON('/getHitsPerSecond');
            
            $.get( "/getHitsPerSecond", function( data ) {
                  $( "div#hits_per_second" ).css( "background-color", "hsl(" + data + ", 100%, 50%)" );
                  $( "div#hits_per_second" ).html( "background-color" + "hsl(" + data + ", 100%, 50%)" );
                });
        });
    }, 200);
    
});