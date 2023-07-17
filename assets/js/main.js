var swiper = new Swiper(".mySwiper", {
  spaceBetween: 30,
  centeredSlides: true,
/*   autoplay: {
    delay: 2500,
    disableOnInteraction: false,
  }, */
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  slidesPerView : 1,
  loop:true,

});

const button = document.getElementById('btn3');

button.addEventListener('click', function() {
  window.location.href = 'assets/gratitude.html';
});