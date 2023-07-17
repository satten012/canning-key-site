  // Функция вызывается API, когда загружается
  function onYouTubeIframeAPIReady() {
    // Создание плеера
    var player = new YT.Player('player', {
      height: '360',
      width: '640',
      videoId: 'I6SPTsYLgl4', // Идентификатор видео
    });
  }