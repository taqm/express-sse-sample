import * as express from 'express';
import * as bodyParser from 'body-parser';
import { interval, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import sseWrapper from 'express-sse-middleware'; // tslint:disable-line

const app = express();

interface MessageEvent {
  text: string;
}

app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(bodyParser.json());
app.use(sseWrapper);

const source$ = new Subject<MessageEvent>();
source$.subscribe(console.log);

app.get('/demo', (req, res) => {
  const conn$ = interval(1000)
    .pipe(map(String))
    .subscribe(res.sse());

  req.on('close', () => {
    conn$.unsubscribe();
  });
});

app.get('/sse', (req, res) => {
  const sendMessage = res.sse();

  const sub$ = source$
    .pipe(filter(ev => true))
    .subscribe((ev) => {
      sendMessage(ev.text);
    });

  // コネクションが切れないように10秒おきにdataを返す
  const conn$ = interval(10000)
    .pipe(map(() => ''))
    .subscribe(sendMessage);

  req.on('close', () => {
    sub$.unsubscribe();
    conn$.unsubscribe();
  });
});

app.post('/message', (req, res) => {
  const param: MessageEvent = req.body;
  source$.next(param);
  res.json({ success: true }).end();
});

app.use('/', express.static('./static'));
app.listen(process.env.PORT || 3000, () => {
  console.log('started!');
});
