import React from "react";
import getUserMedia from "getusermedia";
import emotionClassifier from "./models/emotionclassifier.js";
import emotionModel from "./models/emotionmodel.js";
import pModel from "./models/pmodel.js";
import clm from "clmtrackr/build/clmtrackr.js";
import _ from "lodash";
// import PubSub from 'pubsub-js';

//  Cross-browser implementation of the URL function, rather unimportant
window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

class ReactFacialFeatureTracker extends React.Component {
  state = {
    emotion: { emotion: "" }
  };

  constructor(props) {
    super(props);

    this.PubSub = props.PubSub || PubSub;
  }

  componentDidMount() {
    // OverlayCC is basically a blank layer to draw as far as I understand
    let overlayCC = this.overlay.getContext("2d");

    // The emotion classifier is created and is initiated with an emotion model.
    // The classifier is in principle the computer
    // The emotionModel is almost the dictionary for values and emotions
    let ec = new emotionClassifier();
    ec.init(emotionModel);

    // We create here an Emotion dictionary which is set to zero. This variable is used to temporarily store the values.
    let emotionData = ec.getBlank();

    // Browser is now asking for the webcam
    // The function needs the following arguments: navigator.getUserMedia (options, success);
    getUserMedia({ video: true }, this.getUserMediaCallback.bind(this));

    // Here tracking is implied
    let ctrack = new clm.tracker({ useWebGL: true });

    // The tracker is initiated with the pModel.
    ctrack.init(pModel);

    this.ctrack = ctrack;
    this.overlayCC = overlayCC;
    this.ec = ec;

    let self = this;

    this.video.addEventListener("canplay", this.startVideo.bind(this), false);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.emotion.emotion !== nextState.emotion.emotion) {
      this.PubSub.publish("emotion.update", nextState.emotion);

      return true;
    }

    return false;
  }

  getUserMediaCallback(err, stream) {
    // So it works on all browsers
    // Technically important, but rather unimportant for tracking
    this.video.src =
      (window.URL && window.URL.createObjectURL(stream)) || stream;

    // To make sure that the video is actually played.
    this.video.play();
  }

  startVideo() {
    // start video
    this.video.play();
    // start tracking
    this.ctrack.start(this.video);
    // start loop to draw face
    this.drawLoop();
  }

  drawLoop() {
    requestAnimationFrame(this.drawLoop.bind(this));

    // The numeric parameters
    let cp = this.ctrack.getCurrentParameters();

    // At each frame, level is emptied Try the bottom line out
    this.overlayCC.clearRect(0, 0, 400, 300);

    // If everything has worked out and there are emotion values, the mask should be drawn
    if (this.ctrack.getCurrentPosition()) {
      //this.ctrack.draw(this.overlay);
    }

    // Bring the emotions into a representable form
    let er = this.ec.meanPredict(cp);

    if (er) {
      const emotion = _.maxBy(er, o => {
        return o.value;
      });
      this.setState({ emotion: emotion });
      this.PubSub.publish("emotions.loop", er);
    }
  }

  render() {
    return (
      <div className="the-video">
        <video
          width="400"
          height="300"
          controls="false"
          ref={video => {
            this.video = video;
          }}
        />

        <canvas
          width="400"
          height="300"
          ref={canvas => (this.overlay = canvas)}
        />
      </div>
    );
  }
}

module.exports = ReactFacialFeatureTracker;

window.ReactFacialFeatureTracker = ReactFacialFeatureTracker;
