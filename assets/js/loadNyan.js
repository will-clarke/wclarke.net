$(document).ready(function () {
  $("#nyan-button").click(function (e) {
    e.preventDefault();

    $("body").prepend('<audio id="nyan-audio" src="/sounds/nyan.mp3"></audio>');

    $("#nyan-audio").get(0).play();
    // $("#nyan-audio").animate({volume: 1}, 150);

    $("<link>").appendTo("head").attr({
      type: "text/css",
      rel: "stylesheet",
      href: "/css/nyan.css",
    });

    $("body").prepend('<div class="nyan"></div>');
    $("#nyan-button").unbind();
    $("#nyan-button").text("enough plz");
    $("#nyan-button").click(function (e) {
      e.preventDefault();
      location.reload();
    });
    runNyan();
  });
});

function runNyan() {
  var posX = 100,
    posY = 100,
    px = 0,
    py = 0,
    an = false;
  var nyan = $(".nyan");
  var rainbow = null;
  var altura = 800;
  var largura = parseInt($("body").width());
  var tamanhoTela = parseInt(largura / 9);
  var pilha = [];

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  $(document).on("mousemove", function (event) {
    posX = event.pageX;
    posY = event.pageY;
  });

  for (var i = 0; i < tamanhoTela; i++) {
    var rain = $('<div class="rainbow"/>').css("left", i * 9 + "px");
    $("body").append(rain);
  }
  rainbow = $(".rainbow");

  function criarEstrela() {
    var rand = getRandomInt(3, 14);
    var tempoDeVida = getRandomInt(5, 10);
    var star = $('<div class="star"/>').css({
      width: rand + "px",
      height: rand + "px",
      left: largura - 10 + "px",
      top: Math.floor(Math.random() * altura + 1),
      "-webkit-transition": "all " + tempoDeVida + "s linear",
      "-webkit-transform": "translate(0px, 0px)",
    });
    $("body").append(star);

    window.setTimeout(function () {
      star.css({
        "-webkit-transform": "translate(-" + largura + "px, 0px)",
      });
    }, getRandomInt(5, 10) * 10);

    window.setTimeout(function () {
      star.remove();
    }, tempoDeVida * 1000);
  }

  function moveNyan() {
    var tamX = nyan.width() / 2,
      tamY = nyan.height() / 2;
    px += (posX - px - tamX) / 50;
    py += (posY - py - tamY) / 50;

    nyan.css({
      left: px + "px",
      top: py + "px",
    });
  }
  function peidaArcoIris() {
    var qnt = Math.floor(nyan.position().left / 9) + 2;

    if (pilha.length >= qnt) pilha.pop();

    pilha.unshift(py);

    rainbow.hide();
    for (var i = 0; i < qnt; i++) {
      var am = i % 2;
      if (an) am = i % 2 ? 0 : 1;

      rainbow
        .eq(qnt - i)
        .css({top: pilha[i] + am})
        .show();
    }
  }

  window.setInterval(function () {
    moveNyan();
    peidaArcoIris();
  }, 10);

  window.setInterval(function () {
    criarEstrela();
  }, 300);

  window.setInterval(function () {
    an = !an;
  }, 500);

  var frame = 0;
  window.setInterval(function () {
    nyan.css({"background-position": 34 * frame + "px"});
    frame++;
  }, 100);
}
