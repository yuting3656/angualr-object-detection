import { ElementRef, AfterViewInit, AfterContentChecked } from '@angular/core';
// <reference types="webrtc" />
import { Component, OnInit, OnDestroy, NgZone, ViewChild } from '@angular/core';
import * as cocoSSD from '@tensorflow-models/coco-ssd';
import { from, animationFrameScheduler, timer, defer, of, Scheduler, Observable } from 'rxjs';
import { concatMap, tap, repeat, takeUntil, observeOn } from 'rxjs/operators';
import { SubSink } from 'subsink';

// text to speech
import Speech from 'speak-tts';
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame';
import { ObjectDetectionBaseModel, ObjectDetection } from '@tensorflow-models/coco-ssd';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit, AfterContentChecked, OnDestroy {
  title = 'angular-object-detection';

  // test to speech
  // https://usefulangle.com/post/98/javascript-text-to-speech
  // https://www.npmjs.com/package/speak-tts
  // https://codesandbox.io/s/elated-chatterjee-yt40d
  // https://usefulangle.com/post/98/javascript-text-to-speech

  @ViewChild('predictPaint', { static: false }) predictPaint: ElementRef<HTMLCanvasElement>;

  context: CanvasRenderingContext2D;

  @ViewChild('videoFrame', { static: false }) videoFram: ElementRef<HTMLVideoElement>;

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

  ngAfterViewInit() {
    this.context = (<HTMLCanvasElement>this.predictPaint.nativeElement).getContext('2d');

    if (!this.checkBrower().includes('Safari')) {
      this.videoFram.nativeElement.hidden = true;
    }
  }

  ngAfterContentChecked() {
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
          this.percentage = 70;
          // this.showspinner = false
          this.init_cocossd_obj_prediction();
          // this.predictWithCocoModel()

          // this.test_predect()
        };
      }).catch((error) => { alert(JSON.stringify(error)) });
  }

  // 預測完畫進去圖案上
  renderPredictions = (predictions: cocoSSD.DetectedObject[]) => {
    // console.log('Draw');
    // const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const canvas = this.predictPaint.nativeElement;
    const ctx = this.context

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
      const x = Math.round(prediction.bbox[0]);
      const y = Math.round(prediction.bbox[1]);
      // console.log(x)
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
      const x = Math.round(prediction.bbox[0]);
      const y = Math.round(prediction.bbox[1]);
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
        observeOn(animationFrame),
        // observeOn(of(0, animationFrame)),
        tap((predictions) => this.renderPredictions(predictions)),
        repeat(),
        // takeUntil(timer(20000)),
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


  _addVoicesList = voices => {
    const list = window.document.createElement("div");
    let html =
      '<h2>Available Voices</h2><select id="languages"><option value="">autodetect language</option>';
    voices.forEach(voice => {
      html += `<option value="${voice.lang}" data-name="${voice.name}">${
        voice.name
        } (${voice.lang})</option>`;
    });
    list.innerHTML = html;
    window.document.getElementsByClassName('footerSelect')[0].appendChild(list);
    // window.document.body.appendChild(list);
  };

  initSpeech() {
    const ttsSpeech = new Speech();
    ttsSpeech.init({
      volume: 1,
      lang: 'zh-TW', // 這個要加入不然 default 會沒有發不出聲音
      rate: 1,
      pitch: 1,
      'splitSentences': true,
      listeners: {
        onvoiceschanged: (voices) => {
          console.log("Voices changed", voices);
          // this._addVoicesList(voices)
          // const list = window.document.createElement("div");
          // let html = '';
          // voices.forEach((voice) => {
          //    html += `"${voice.name}"`
          // });
          // list.innerHTML = html
          // window.document.getElementsByClassName("voicesList")[0].appendChild(list)

          // ttsSpeech.setVoice(voices[ voices.length - 2 ].name)
          // ttsSpeech.setLanguage(voices[ voices.length - 2 ].lang)
          this.speech = ttsSpeech;
        }
      }
    }).then((data) => {
      ttsSpeech.setVoice(data.voices[data.voices.length - 2].name)
      ttsSpeech.setLanguage(data.voices[ data.voices.length - 2 ].lang)
      // console.log(data.voices[ data.voices.length - 2 ].lang)
      this.speech = ttsSpeech;
    });
  }

  speakOut(prediction: cocoSSD.DetectedObject) {

    // person
    if (prediction.class === 'person' && this.speakFlag !== 'person') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '五郎喔', //prediction.class,//'五郎喔',
          queue: false,
        }
      ).then(() => { });
    };

    // tv
    if (prediction.class == 'tv' && this.speakFlag !== 'tv') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '賣購跨點系阿', //prediction.class, //'賣購跨點系阿!',
          queue: false,
        }
      ).then(() => { });
    };

    // cup
    if (prediction.class == 'cup' && this.speakFlag !== 'cup') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '來杯可樂吧', //prediction.class, //'來杯可樂吧',
          queue: false,
        }
      ).then(() => { });
    };

    // teddy bear
    if (prediction.class == 'teddy bear' && this.speakFlag !== 'teddy bear') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: prediction.class, //'熊熊',
          queue: false,
        }
      ).then(() => { });
    };

    // chair
    if (prediction.class == 'chair' && this.speakFlag !== 'chair') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: '能站就不要座', //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };
  }

  updateSpeakFlag(predicitonClass: string) {
    this.speakFlag = predicitonClass;
  }

  // test save model to client browser

  // saveModel() {
  //   cocoSSD.load({ base: 'lite_mobilenet_v2' }).then((model) => {
  //      model.
  //   });
  // }

  // test_detectFrame = (video, model) => {
  //   model.detect(video).then(predictions => {
  //     this.renderPredictions(predictions);
  //     requestAnimationFrame(() => {
  //       this.test_detectFrame(video, model);
  //     });
  //   });
  // }

  // public async predictWithCocoModel() {
  //   const model = await cocoSSD.load({ base: 'lite_mobilenet_v2' });
  //   this.test_detectFrame(this.video, model);
  //   console.log('model loaded');
  // }

  // public async test_predect() {
  //   this.percentage = 80;
  //   const model = await cocoSSD.load({ base: 'lite_mobilenet_v2' });
  //   this.percentage = 100;
  //   this.showspinner = false
  //   this.model = model;
  //   this.intervalRun = setInterval(() => {
  //     this.model.detect(this.video).then((predictions: cocoSSD.DetectedObject[]) => {
  //       const canvas = this.predictPaint.nativeElement;
  //       canvas.width = 640;//window.innerWidth; //800;
  //       canvas.height = 480;// window.innerHeight;//600;

  //       // 設定文字
  //       const font = '24px sans-serif';
  //       this.context.font = font;
  //       this.context.textBaseline = 'top';

  //       this.context.drawImage(this.video, 0, 0, 640, 480)

  //       predictions.forEach(prediction => {

  //         const x = Math.round(prediction.bbox[0]);
  //         const y = Math.round(prediction.bbox[1]);
  //         // console.log(x)
  //         const width = prediction.bbox[2];
  //         const height = prediction.bbox[3];
  //         // 畫上框框
  //         this.context.strokeStyle = '#00FFFF';
  //         this.context.lineWidth = 2;
  //         this.context.strokeRect(
  //           x, y, width, height);
  //         // 畫上背景
  //         this.context.fillStyle = '#00FFFF';
  //         const textWidth = this.context.measureText(prediction.class).width;
  //         const textHeight = parseInt(font, 10); // base 10
  //         this.context.fillRect(x, y, textWidth + 4, textHeight + 4);

  //         const x_1 = Math.round(prediction.bbox[0]);
  //         const y_1 = Math.round(prediction.bbox[1]);
  //         this.context.fillStyle = '#000000';
  //         this.context.fillText(prediction.class, x_1, y_1);
  //         this.speakOut(prediction)
  //       });
  //     })
  //   }, 300); // 600 還是跑不動
  // }


  checkBrower = function(){
    var ua= navigator.userAgent, tem,
    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])){
        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE '+(tem[1] || '');
    }
    if(M[1]=== 'Chrome'){
        tem= ua.match(/\b(OPR|Edge?)\/(\d+)/);
        if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera').replace('Edg ', 'Edge ');
    }
    M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
    return M.join(' ');
};



}



