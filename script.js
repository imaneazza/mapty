'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapEvent;
    #workouts = []
    #mapZoomLevel = 20;

    constructor() {

        this._getPosition();
        form.addEventListener('submit', this._newWorkout.bind(this))
        inputType.addEventListener('change', this._toggleElevationField)
        containerWorkouts.addEventListener('click', this._moveTopopup.bind(this))
        this._getFrominLocalStorage();
    }


    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this), function () {
                    alert('could not get the location')
                })
    }

    _loadMap(position) {
        const {latitude} = position.coords
        const {longitude} = position.coords
        const coord = [latitude, longitude]
        this.#map = L.map('map').setView(coord, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        //Handling Click on maps
        this.#map.on('click', this._showForm.bind(this))
        this.#workouts.forEach(work=>{
            this._renderWorkoutMarker(work)

        })

    }

    _showForm(event) {
        this.#mapEvent = event;
        form.classList.remove('hidden')
        inputDistance.focus()
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')

    }

    _newWorkout(e) {
        const validInput = (...inputs) =>
            inputs.every(num => Number.isFinite(num))
        const allPositif = (...inputs) => inputs.every(num => num > 0)
        e.preventDefault()
        // get data from form
        const type = inputType.value;
        const distance = +inputDistance.value
        const duration = +inputDuration.value
        const {lng, lat} = this.#mapEvent.latlng
        let workout;

        // check if valid

        //if running create running object
        if (type == 'running') {
            const cadence = +inputCadence.value
            if (!validInput(distance, duration, cadence) ||
                !allPositif(distance, duration, cadence)) return alert("Inputs have to be positive Numbers");
            workout = new Running([lat, lng], distance, duration, cadence)
        }

        //if cycling create cycling object
        if (type == 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInput(distance, duration, elevation) ||
                !allPositif(distance, duration)) return alert("Inputs have to be positive Numbers");
            workout = new Cycling([lat, lng], distance, duration, elevation)

        }
        this.#workouts.push(workout)
        //display Marker
        this._renderWorkoutMarker(workout)
        this._renderWorkout(workout)
        //clear fields
        this._hideForms()
        // set local storage
        this._storeinLocalStorage();

    }

    _storeinLocalStorage() {
        localStorage.setItem('workouts',JSON.stringify(this.#workouts))
    }
    _getFrominLocalStorage() {
        const data =  JSON.parse(localStorage.getItem('workouts'))
        if(!data) return ;
        this.#workouts = data;
        this.#workouts.forEach(work=>{
            this._renderWorkout(work)
        })
    }

    _hideForms() {
        inputDistance.value = inputCadence.value = inputDuration.value = ''
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid'
        }, 1000)
        ;


    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            })).setPopupContent(`${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `<li class="workout workout--${workout.type}" 
data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon"> ${workout.type === 'running' ? '🏃' : '🚴'}‍️</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">min</span>
          </div>`
        if (workout.type == 'running') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>`
        } else {
            html += ` <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>`
        }
        form.insertAdjacentHTML('afterend', html)
    }

    _moveTopopup(e) {
        const workout = e.target.closest('.workout')
        if (!workout) return;
        const workoutElement = this.#workouts.find(work => work.id === workout.dataset.id)
        this.#map.setView(workoutElement.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
        // workoutElement.click();
    }
    reset(){
        localStorage.removeItem('workouts')
        location.reload();
    }

}


class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1).toLowerCase()} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running'

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription()
    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.distance
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling'

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription()
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed
    }
}

const currentApp = new App();
const cycl1 = new Cycling([15, -10], 120, 10, 900);
const run = new Running([15, -10], 100, 5, 120)

