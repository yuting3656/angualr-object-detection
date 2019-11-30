// <reference types="webrtc" />
import { Component, OnInit, OnDestroy } from '@angular/core';
import * as cocoSSD from '@tensorflow-models/coco-ssd';
import { from, animationFrameScheduler, timer, defer } from 'rxjs';
import { concatMap, tap, repeat, takeUntil, observeOn } from 'rxjs/operators';
import { SubSink } from 'subsink';

// text to speech
import Speech from 'speak-tts';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'angular-object-detection';

  // test to speech
  // https://usefulangle.com/post/98/javascript-text-to-speech
  // https://www.npmjs.com/package/speak-tts
  // https://codesandbox.io/s/elated-chatterjee-yt40d

  private subs = new SubSink();
  // 設定Webcam
  video: HTMLVideoElement;
  // yuting spinner
  showspinner = true;
  // speech
  speech: Speech;
  // loading %
  percentage: number;
  // speak flag
  speakFlag: string;

  constructor() {
    this.initSpeech();
    this.percentage = 0;
  }

  ngOnInit() {
    this.webcam_init();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // run相機
  webcam_init() {
    this.video = document.getElementById('vid') as HTMLVideoElement;

    // Standard
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          // environment 手機可以
          facingMode: 'environment',
        }
      })
      .then(stream => {
        this.percentage = 50;
        this.video.srcObject = stream;
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.percentage = 65;
          this.init_cocossd_obj_prediction();
        };
      }).catch((error) => { alert(JSON.stringify(error)) });
  }

  // 預測完畫進去圖案上
  renderPredictions = (predictions: cocoSSD.DetectedObject[]) => {
    // console.log('Draw');
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const ctx = canvas.getContext('2d');

    // 設定寬高
    // 這邊會設定這 size 是因為我的 usb 相機 default 抓圖就是這 size
    canvas.width = 640;//window.innerWidth; //800;
    canvas.height = 480;// window.innerHeight;//600;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 設定文字
    const font = '24px sans-serif';
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

    // 把每一個物件畫上去
    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // 畫上框框
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        x, y, width, height);
      // 畫上背景
      ctx.fillStyle = '#00FFFF';
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });

    // 畫上標籤
    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      ctx.fillStyle = '#000000';
      ctx.fillText(prediction.class, x, y);
      this.speakOut(prediction)
    });
  }

  // 把讀取檔案的 cocssd code 抽出來
  init_cocossd_obj_prediction() {
    this.percentage = 70;
    const action$ = (model: cocoSSD.ObjectDetection) =>
      defer(() => model.detect(this.video)).pipe(
        observeOn(animationFrameScheduler),
        tap((predictions) => this.renderPredictions(predictions)),
        // takeUntil(timer(2000)),
        repeat(),
      );
    this.percentage = 75;
    // 訂閱Observeable
    this.subs.add(
      // 下載模型
      from(cocoSSD.load({ base: 'lite_mobilenet_v2' })).pipe(
        // 預測
        tap(() => this.percentage = 80),
        concatMap(model => action$(model)),
        tap(() => this.percentage = 90),
        tap(() => this.showspinner = false),
      ).subscribe(() => { }, (error) => {
        console.log('出包搂 相機GG');
        console.log(error);
        // this.webcam_init();
      })
    );
  }

  initSpeech() {
    const speech = new Speech();
    speech.init({
      'volume': 1,
      'lang': 'zh-Hans',
      'rate': 1,
      'pitch': 1,
      // 'voice': 'Chinese Mandarin female',
      'splitSentences': true,
      listeners: {
        onvoiceschanged: (voices) => {
          console.log("Voices changed", voices);
        }
      }
    }).then((data) => {
      console.log("Speech is ready", data);
      this.speech = speech;
    });
  }

  speakOut(prediction: cocoSSD.DetectedObject) {
    // person
    if (prediction.class === 'person' && this.speakFlag !== 'person') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '五郎喔',
          queue: false,
          listeners: {
            onstart: () => {
                console.log("Start utterance")
            },
            onend: () => {
                console.log("End utterance")
            },
            onresume: () => {
                console.log("Resume utterance")
            },
            onboundary: (event) => {
                console.log(event.name + ' boundary reached after ' + event.elapsedTime + ' milliseconds.')
            }
          }
        }
      ).then(()=>{});
    };

    // tv
    if (prediction.class == 'tv' && this.speakFlag !== 'tv') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '賣購跨點系阿!',
          queue: false,
          listeners: {
            onstart: () => {
                console.log("Start utterance")
            },
            onend: () => {
                console.log("End utterance")
            },
            onresume: () => {
                console.log("Resume utterance")
            },
            onboundary: (event) => {
                console.log(event.name + ' boundary reached after ' + event.elapsedTime + ' milliseconds.')
            }
          }
        }
      ).then(()=>{});
    };

    // cup
    if (prediction.class == 'cup' && this.speakFlag !== 'cup') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '來杯可樂吧',
          queue: false,
          listeners: {
            onstart: () => {
                console.log("Start utterance")
            },
            onend: () => {
                console.log("End utterance")
            },
            onresume: () => {
                console.log("Resume utterance")
            },
            onboundary: (event) => {
                console.log(event.name + ' boundary reached after ' + event.elapsedTime + ' milliseconds.')
            }
          }
        }
      ).then(()=>{});
    };

    // teddy bear
    if (prediction.class == 'teddy bear' && this.speakFlag !== 'teddy bear') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '熊熊',
          queue: false,
          listeners: {
            onstart: () => {
                console.log("Start utterance")
            },
            onend: () => {
                console.log("End utterance")
            },
            onresume: () => {
                console.log("Resume utterance")
            },
            onboundary: (event) => {
                console.log(event.name + ' boundary reached after ' + event.elapsedTime + ' milliseconds.')
            }
          }
        }
      ).then(()=>{});
    };

    // chair
    if (prediction.class == 'chair' && this.speakFlag !== 'chair') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '能站就不要座',
          queue: false,
          listeners: {
            onstart: () => {
                console.log("Start utterance")
            },
            onend: () => {
                console.log("End utterance")
            },
            onresume: () => {
                console.log("Resume utterance")
            },
            onboundary: (event) => {
                console.log(event.name + ' boundary reached after ' + event.elapsedTime + ' milliseconds.')
            }
          }
        }
      ).then(()=>{});
    };
  }

  updateSpeakFlag(predicitonClass: string) {
    this.speakFlag = predicitonClass;
  }
}
