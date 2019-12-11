import { ElementRef, AfterViewInit, AfterContentChecked } from '@angular/core';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';

// <reference types="webrtc" />
import { Component, OnInit, OnDestroy, NgZone, ViewChild } from '@angular/core';
import * as cocoSSD from '@tensorflow-models/coco-ssd';
import { from, animationFrameScheduler, timer, defer, of, Scheduler, Observable } from 'rxjs';
import { concatMap, tap, repeat, takeUntil, observeOn } from 'rxjs/operators';
import { SubSink } from 'subsink';

// text to speech
import Speech from 'speak-tts';
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame';


export class SayYourName {
  car: string;
  chair: string;
  laptop: string;
  book: string;
  person: string;
  cup: string;
  teddyBear: string;
  clock: string;
  dog: string;
  cat: string;
  tv: string;

  constructor() {
    this.car = '五掐喔',
    this.chair = '能站就不要坐',
    this.laptop = '我是天才小駭客',
    this.book = '有黃金',
    this.person = '五郎喔',
    this.cup = '來杯可樂吧',
    this.teddyBear = '雄雄',
    this.clock = '時間就是金錢　朋友',
    this.dog = '旺旺',
    this.cat = '喵喵',
    this.tv = '賣購跨點系阿'
  }

}



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
  speakFlag: string;// 存入使用者所使用的 voices [SpeechSynthesisVoice]
  voiceData: any;
  userVocie: string;
  userLang: string;
  voicesShowingFlag: boolean;
  // 看使用者所使用的瀏覽器
  userBrowser: string;
  safariUser: boolean;
　
  //
  sayYourNameData = new SayYourName()
  sayYourNameFrom = this.fb.group({
    car: [this.sayYourNameData.car, ],
    chair: [this.sayYourNameData.chair, ],
    laptop: [this.sayYourNameData.laptop,],
    book: [this.sayYourNameData.book,],
    person: [this.sayYourNameData.person,],
    cup: [this.sayYourNameData.cup,],
    teddyBear: [this.sayYourNameData.teddyBear,],
    clock: [this.sayYourNameData.clock,],
    dog: [this.sayYourNameData.dog,],
    cat: [this.sayYourNameData.cat,],
    tv: [this.sayYourNameData.tv,],
  })

  constructor(private fb: FormBuilder, ) {
    this.initSpeech();
    this.percentage = 0;
    this.userBrowser = this.checkBrower();

  }

  ngOnInit() {
    this.webcam_init();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  ngAfterViewInit() {
    this.context = (<HTMLCanvasElement>this.predictPaint.nativeElement).getContext('2d');

    if (!this.userBrowser.includes('Safari')) {
      this.videoFram.nativeElement.hidden = true;
    } else {
      this.safariUser = true;
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
      }).catch((error) => {
        alert(JSON.stringify(error));
        console.log(error);
      });
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
        observeOn(animationFrameScheduler),
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
          // 實測 ios 手機進入這
          this.voiceData = voices
          this.speech = ttsSpeech;
          this.voicesShowingFlag = true;
        }
      }
    }).then((data) => {
      // 實測 anfroid 手機會直接進入這
      this.voiceData = data
      this.speech = ttsSpeech;
      this.voicesShowingFlag = true;

      if (!this.userBrowser.includes('Safari')) {
        // 非 ios
        this.userLang = this.voiceData.voices[this.voiceData.voices.length - 1].lang
        this.userVocie = this.voiceData.voices[this.voiceData.voices.length - 1].name

        this.speech.setLanguage(this.voiceData.voices[this.voiceData.voices.length - 1].lang)
        this.speech.setVoice(this.voiceData.voices[this.voiceData.voices.length - 1].name)
      } else {
        // 是ios
        this.userLang = this.voiceData.voices[this.voiceData.voices.length - 2].lang
        this.userVocie = this.voiceData.voices[this.voiceData.voices.length - 2].name

        this.speech.setLanguage(this.voiceData.voices[this.voiceData.voices.length - 2].lang)
        this.speech.setVoice(this.voiceData.voices[this.voiceData.voices.length - 2].name)
      }
    });
  }

  speakOut(prediction: cocoSSD.DetectedObject) {


    // person
    if (prediction.class === 'person' && this.speakFlag !== 'person') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.person, //prediction.class,//'五郎喔',
          queue: false,
        }
      ).then(() => { });
    };

    // tv
    if (prediction.class == 'tv' && this.speakFlag !== 'tv') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.tv, //prediction.class, //'賣購跨點系阿!',
          queue: false,
        }
      ).then(() => { });
    };

    // cup
    if (prediction.class == 'cup' && this.speakFlag !== 'cup') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.cup, //prediction.class, //'來杯可樂吧',
          queue: false,
        }
      ).then(() => { });
    };

    // teddy bear
    if (prediction.class == 'teddy bear' && this.speakFlag !== 'teddy bear') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.teddyBear, //prediction.class, //'熊熊',
          queue: false,
        }
      ).then(() => { });
    };

    // chair
    if (prediction.class == 'chair' && this.speakFlag !== 'chair') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.chair, //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };

    // dog
    if (prediction.class == 'dog' && this.speakFlag !== 'dog') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.dog, //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };

    // cat
    if (prediction.class == 'cat' && this.speakFlag !== 'cat') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.cat, //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };

    // clock
    if (prediction.class == 'clock' && this.speakFlag !== 'clock') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.clock, //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };

    // car
    if (prediction.class == 'car' && this.speakFlag !== 'car') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.car, //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };

    // book
    if (prediction.class == 'book' && this.speakFlag !== 'book') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.book, //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };

    // laptop
    if (prediction.class == 'laptop' && this.speakFlag !== 'laptop') {
      this.updateSpeakFlag(prediction.class)
      this.speech.speak(
        {
          text: this.sayYourNameData.laptop, //prediction.class, //'能站就不要座',
          queue: false,
        }
      ).then(() => { });
    };


  }

  updateSpeakFlag(predicitonClass: string) {
    this.speakFlag = predicitonClass;
  }


  checkBrower = function () {
    var ua = navigator.userAgent, tem,
      M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
      return 'IE ' + (tem[1] || '');
    }
    if (M[1] === 'Chrome') {
      tem = ua.match(/\b(OPR|Edge?)\/(\d+)/);
      if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera').replace('Edg ', 'Edge ');
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join(' ');
  };

  ai_speak() {
    const defalutLang = 'zh-TW'
    const defaultVocie = 'Mei-Jia'
    this.speech.setLanguage(defalutLang)
    this.speech.setVoice(defaultVocie)
    this.userLang = defalutLang
    this.userVocie = defaultVocie
    this.speech.speak(
      {
        text: '有聲音代表 我可以開始說話了', //prediction.class, //'熊熊',
        queue: false,
      }
    ).then(() => { });
  }

  voiceChange($event) {
    console.log(typeof ($event))
    console.log($event)
    console.log($event.target.value)
    console.log($event.target.options[$event.target.options.selectedIndex].lang)

    this.updateSpeech(
      $event.target.value,
      $event.target.options[$event.target.options.selectedIndex].lang
    )

  }

  updateSpeech(voice: string, lang: string) {
    this.userLang = lang
    this.userVocie = voice
    this.speech.setLanguage(lang)
    this.speech.setVoice(voice)
  }

  onSubmit() {
    this.sayYourNameData = this.sayYourNameFrom.value;
  }
}



