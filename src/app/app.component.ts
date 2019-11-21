import { Component, OnInit } from '@angular/core';
import * as cocoSSD from '@tensorflow-models/coco-ssd';
import { from, animationFrameScheduler, timer, defer } from 'rxjs';
import { concatMap, tap, repeat, takeUntil, observeOn } from 'rxjs/operators';
import { SubSink } from 'subsink';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent  implements OnInit{
  title = 'angular-object-detection';

  private subs = new SubSink();
  // 設定Webcam
  video: HTMLVideoElement;
  // yuting spinner
  showspinner = true;

  constructor() { }

  ngOnInit() {
    this.webcam_init();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // run相機
  webcam_init() {
    this.video = document.getElementById('vid') as HTMLVideoElement;
      navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          // environment 手機可以
          facingMode: 'environment',
        }
      })
      .then(stream => {
        this.video.srcObject = stream;
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.init_cocossd_obj_prediction();
        };
      });
  }

  // 預測完畫進去圖案上
  renderPredictions = (predictions: cocoSSD.DetectedObject[]) => {
    // console.log('Draw');
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const ctx = canvas.getContext('2d');

    // 設定寬高
    canvas.width = window.innerWidth * 0.8 ; //800;
    canvas.height =  window.innerHeight  * 0.6 //600;

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
      ctx.strokeRect(x, y, width, height);
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
      if (prediction.class == 'person') {
        ctx.fillText('kkkk', 1, 1);
      }
    });
  }

  // 把讀取檔案的 cocssd code 抽出來
  init_cocossd_obj_prediction() {
    const action$ = (model: cocoSSD.ObjectDetection) =>
    defer(() => model.detect(this.video)).pipe(
      observeOn(animationFrameScheduler),
      tap((predictions) => this.renderPredictions(predictions)),
      takeUntil(timer(5000)),
      repeat()
    );

  // 訂閱Observeable
  this.subs.add(
    // 下載模型
    from(cocoSSD.load({ base: 'lite_mobilenet_v2' })).pipe(
      // 預測
      concatMap(model => action$(model)),
      // tap(() => this.webcam_init()),
      tap(() => this.showspinner = false),
      // repeat(),
    ).subscribe(()=> {}, (error)=>{
      console.log('出包搂 相機GG');
      console.log(error);
      // this.webcam_init();
      })
      );
  }
}
