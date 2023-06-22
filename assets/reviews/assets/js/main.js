window.addEventListener('DOMContentLoaded', (event) => {
  moment.locale('uk')

  Vue.use(Vue2StoragePlugin)
  Vue.use(VueInfiniteLoading)
  Vue.use(VueLazyload)

  Vue.component('light-box', Lightbox.default)

  new Vue({
    data: {
      config: {
        shown: 3,
        bunch: 3,
        delay: 5000,

        fake: {
          rating: 4.8,
          quantity: 672
        },

        inline: false,
        filepath: '/assets/reviews/reviews.json'
      },

      delayed: null,
      preview: true,

      usrname: null,
      usrmail: null,

      reviews: [],
      postfix: "_mosquito_hammok",

      overlay: {
        answer: false,
        review: false
      }
    },

    computed: {
      summaryRating() {
        const realStars = this.reviews.reduce((acc, cur) => acc + cur.stars, 0)
        const fakeStars = this.config.fake.rating * this.config.fake.quantity

        return ((realStars + fakeStars) / this.summaryQuantity).toFixed(1)
      },
      summaryQuantity() {
        return this.reviews.length + this.config.fake.quantity
      },

      reviewsShown() {
        return this.reviews.slice(0, this.config.shown)
      }
    },

    methods: {
      async getReviews() {
        if (this.config.inline) return window._app_revdata || []

        try {
          const ms = '?ms=' + Date.now()
          const response = await fetch(this.config.filepath + ms)
          return await response.json()
        } catch (error) {
          console.log(error)
          return []
        }
      },

      starRatingProgress(value) {
        return { width: Math.abs((value * 20) - 100) + '%' }
      },

      changeFilename(file) {
        return file
      },

      mediaFiles(files) {
        return files.map(file => {
          file = this.changeFilename(file)
          return { thumb: file, src: file }
        })
      },

      openGallery(i, id) {
        this.$refs[`lightbox-${i}`][0].showImage(id)
      },

      disabledPreview(event) {
        event.target.remove()

        this.preview = false
        this.$el.scrollIntoView({ behavior: 'smooth' })
      },

      infiniteHandler($state) {
        if (this.config.shown > this.reviews.length) return

        new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
          this.config.shown += this.config.bunch
        }).finally(() => $state.loaded())
      },

      overlayOpen(type, value) {
        if (this.usrname) {
          this.$refs.reviewForm.elements.name.value = this.usrname
          this.$refs.answerForm.elements.name.value = this.usrname
        }
        if (this.usrmail) {
          this.$refs.reviewForm.elements.email.value = this.usrmail
          this.$refs.answerForm.elements.email.value = this.usrmail
        }

        this.overlay[type] = value
      },

      updateInputRating(value) {
        const rating = parseInt(value)
        const element = this.$refs.inputRating

        element.querySelector('input').value = rating
        element.querySelectorAll('div').forEach((item, index) => {
          item.classList.toggle('is-active', index < rating)
        })
      },

      onSubmitAnswerForm(event) {
        event.preventDefault()

        const index = this.overlay.answer
        const elems = event.target.elements

        if (elems.name.value.length < 2)
          return alert('Необходимо указать имя и фамилию')

        if (elems.email.value.length < 3)
          return alert('Необходимо указать электронную почту')

        if (elems.message.value.length > 500)
          return alert('Комментарий слишком длинный')

        this.reviews[index].replies.push({
          date: Date.now(),
          name: elems.name.value,
          message: elems.message.value
        })

        this.usrname = elems.name.value
        this.usrmail = elems.email.value

        this.overlay.answer = false
        event.target.reset()

        return false
      },

      async onSubmitReviewForm(event) {
        event.preventDefault()

        const elems = event.target.elements

        if (!parseInt(elems.rating.value))
          return alert('Необходимо поставить оценку')

        if (elems.name.value.length < 2)
          return alert('Необходимо указать имя и фамилию')

        if (elems.email.value.length < 3)
          return alert('Необходимо указать электронную почту')

        if (elems.message.value.length > 1000)
          return alert('Комментарий слишком длинный')

        let files = Array.from(elems.upload.files)

        try {
          files = await Promise.all(files.map(file => resizeImage(file, 640)))
        } catch (error) {
          files = []
        }

        this.reviews.unshift({
          date: Date.now(),
          name: elems.name.value,
          stars: parseInt(elems.rating.value),
          message: elems.message.value,
          votes: { up: 0, down: 0, v: null },
          files: files,
          replies: []
        })

        this.updateInputRating(0)

        this.usrname = elems.name.value
        this.usrmail = elems.email.value

        this.overlay.review = false
        event.target.reset()

        return false
      }
    },

    async created() {
      try {
        if (new URLSearchParams(window.top.location.search).has('r_reset')) {
          this.$storage.clear()
        }
      } catch (err) {
        console.log('cross-original frame (r_reset does not work)');
      }

      this.usrname = this.$storage.get('usrname', null)
      this.usrmail = this.$storage.get('usrmail', null)

      this.reviews = await this.$storage.remember('reviews' + this.postfix, async () => {
        const reviews = await this.getReviews()

        const recent = randomInteger(3, 5)

        const thisMoment = moment()
        const startOfDay = moment().startOf('day')
        const justBefore = moment().subtract(2, 'days')

        const dates = Array.from(reviews).map((_, index) => {
          return randomInteger(index < recent ? +startOfDay : +justBefore, +thisMoment)
        }).sort((a, b) => b - a)

        const [delayed, ...normals] = reviews.map((review, index) => {
          return _.defaultsDeep(review, {
            date: dates[index],
            name: 'Anonym',
            stars: 5,
            votes: { up: 0, down: 0, v: null },
            files: [],
            replies: []
          })
        })

        normals.forEach(review => {
          let min = review.date

          review.replies.forEach(reply => {
            reply.date = min = randomInteger(min, +thisMoment)
          })
        })

        delayed.replies = []
        delayed.votes.up = delayed.votes.down = 0

        const delayedObserver = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            entries.forEach(entry => delayedObserver.unobserve(entry.target))

            setTimeout(() => {
              delayed.date = Date.now()
              this.reviews.unshift(delayed)
            }, this.config.delay)
          }
        })
        delayedObserver.observe(this.$refs.scroller)

        return normals
      })

      this.$el.classList.remove('is-loading')

      this.$watch('reviews', reviews => {
        this.$storage.set('reviews' + this.postfix, reviews)
      }, { deep:true })

      this.$watch('usrname', usrname => {
        this.$storage.set('usrname', usrname)
      })
      this.$watch('usrmail', usrmail => {
        this.$storage.set('usrmail', usrmail)
      })
    }
  }).$mount('#app')

  setInterval(() => {
    const height = document.body.offsetHeight
    const styles = 'display: block; width: 100%; margin: 0 auto;'

    window.postMessage({ height, styles }, '*')
  }, 1000)

  function resizeImage(imageFile, maxSize) {
    return new Promise(resolve => {
    const reader = new FileReader()
    reader.addEventListener('load', function (event) {
      const img = document.createElement('img')
      img.addEventListener('load', function (event) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      const ratio = Math.min(maxSize / this.width, maxSize / this.height)

      canvas.width = this.width * ratio
      canvas.height = this.height * ratio

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      return resolve(canvas.toDataURL(imageFile.type))
      })
      img.src = event.target.result
    })
    reader.readAsDataURL(imageFile)
    })
  }

  function randomInteger(min, max) {
    return Math.floor(min + Math.random() * (max + 1 - min))
  }
})
