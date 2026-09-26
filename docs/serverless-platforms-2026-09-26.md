# 서버리스 플랫폼 무료 티어 비교

검토일: 2026-09-26. 앞선 문서: [serverless-feasibility-2026-09-26.md](./serverless-feasibility-2026-09-26.md)(Codex), [serverless-review-2026-09-26.md](./serverless-review-2026-09-26.md)(2차 의견).

Vercel 외 서버리스·PaaS를 **무료 티어 위주로** 비교한다. 근거는 각 플랫폼의 공식 문서·요금표·약관이다. 순위를 가르는 수치(Cloud Run 무료 한도와 서울 가격 등급, Lambda 스트리밍 대역폭 제한)는 원문을 다시 확인했다. 어느 플랫폼에도 배포하지 않았고 계정도 만들지 않았다.

**판정: 이 앱을 무료 티어에서 제약 없이 돌릴 수 있는 곳은 없다.** 조건을 받아들이면 Google Cloud Run, Vercel Hobby, AWS Lambda 세 곳이 후보다. 어느 곳이든 **그 플랫폼 IP에서 YouTube 추출이 되는지는 미검증**이다. 현재 확인된 것은 Oracle IP뿐이다.

## 비교 기준 (운영 서버 실측)

[2차 의견](./serverless-review-2026-09-26.md)에서 잰 3분 33초 곡 기준값이다.

| 항목 | 값 |
|---|---|
| CPU | 곡당 약 29 CPU-초 (1/8 OCPU 기준. 더 빠른 vCPU에서는 15~30초로 가정) |
| 메모리 | 최대 RSS 284MB (yt-dlp + JS 런타임) |
| 결과 파일 | MP3 320k 8.5MB, FLAC 47MB |
| JS 런타임 | node로 동작 확인 (deno 불필요) |

아래 "월 무료 곡 수"는 이 값을 무료 한도에 대입한 **추정치**다. 가정: 1 vCPU, 곡당 벽시계 약 30초. 공식 수치가 아니며 PoC에서 실제 사용량으로 확인해야 한다.

## 후보 3곳

| | Google Cloud Run | Vercel Hobby | AWS Lambda |
|---|---|---|---|
| 월 무료 한도 | vCPU 180,000초, 메모리 360,000 GiB-초, 요청 200만 | Active CPU 4시간, 메모리 360 GB-시간 | 400,000 GB-초, 요청 100만 |
| 월 무료 곡 수 (추정) | **약 6,000곡** (Tier 1 리전 기준, 서울은 더 적음) | 약 500~900곡 | 약 7,000곡 |
| 요청당 최대 시간 | **60분** | 300초 | 15분 |
| 실행 파일 | 컨테이너 이미지 | 번들 포함 (250MB) | 컨테이너 이미지 (10GB) |
| 큰 응답 | HTTP/1 32MiB 제한, 스트리밍·HTTP/2는 제한 없음 | 4.5MB 제한, 스트리밍으로 우회 | 버퍼 6MB, 스트리밍 200MB. **6MB 이후 2MB/s 제한** |
| 임시 디스크 | 메모리를 차지함 | /tmp 500MB | /tmp 512MB~10GB, 메모리와 별도 |
| 카드 | 필요 | **불필요** | 확인 못함 |
| 한도 초과 시 | 과금. Spend cap(프리뷰)이 Cloud Run을 지원하나 즉시 적용되지 않음 | **30일 정지, 과금 없음** | 과금. Lambda를 멈추는 하드 캡 없음 |
| 서울 리전 | 있음 (Tier 2) | 있음 (`icn1`) | 있음 (`ap-northeast-2`) |
| 출구 IP | Google | AWS | AWS |

### Google Cloud Run — 1순위

- **현재 구조와 가장 잘 맞는다.** 지금 앱을 컨테이너로 묶어 거의 그대로 올릴 수 있다. 60분 타임아웃이면 3시간 상한도 대부분 유지된다.
- 인스턴스당 동시 요청을 1로 설정하면 다운로드마다 전용 CPU를 받는다(Vercel Fluid Compute의 인스턴스 공유 문제가 없다). 최대 인스턴스 수로 비용도 묶을 수 있다.
- 약점 1: 파일시스템이 메모리 위에 있어 긴 FLAC은 메모리 상한에 걸린다. 결과 파일 크기 제한이나 메모리 상향이 필요하다.
- 약점 2: 무료 한도는 "Tier 1 가격 기준 금액 할인"이다. 서울(`asia-northeast3`)은 Tier 2라 같은 무료분으로 쓸 수 있는 양이 줄어든다. 도쿄(`asia-northeast1`)는 Tier 1이다.
- 약점 3: 무료 전송은 북미 1GiB뿐이라 한국으로의 파일 전송은 과금된다. 1,000곡에 약 8GB (단가 미확인).
- 참고: Google은 YouTube와 같은 회사다. 차단 여부와의 관계는 알 수 없고 사실로만 적는다.

### Vercel Hobby — 2순위

- 카드가 필요 없고 **한도를 넘어도 요금이 나가지 않는다**(30일 정지). 인증 없는 공개 URL이라는 점을 생각하면 가장 안전하다.
- 300초 제한 때문에 긴 영상은 포기해야 하고, 무료 CPU가 가장 작다. 비상업 개인 용도만 허용된다.
- 상세는 [2차 의견](./serverless-review-2026-09-26.md) 참고.

### AWS Lambda — 3순위

- 무료 한도가 크고 서울 리전에서 스트리밍을 지원한다(2026-04-07부터 전 상용 리전).
- 스트리밍 응답은 처음 6MB 이후 **최대 2MB/s**다. MP3는 영향이 거의 없고, FLAC 47MB는 약 20초가 추가된다.
- 클라이언트가 연결을 끊어도 함수는 끝까지 실행되고 과금된다.
- 2025년 개편 이후 신규 계정의 Free 플랜은 6개월 또는 크레딧 소진 시 계정이 닫힌다. Paid 플랜에서도 Lambda 상시 무료분은 유지되지만 초과분은 과금되고 하드 캡이 없다. 긴급 차단 수단은 예약 동시성 0뿐이다.
- 신규 계정은 동시성·메모리 할당량이 낮게 시작한다(구체 수치는 문서에 없음).

## 조건부로만 가능

| 플랫폼 | 가능한 점 | 막히는 점 |
|---|---|---|
| Cloudflare Containers | 임의 이미지, 고정 최대 실행 시간 없음, `APAC` 배치, 콜드 스타트 1~3초 | **Workers Paid($5/월) 필수**, 무료 불가. 포함분 vCPU 375분 ≈ 750~1,500곡. 기본 `sleepAfter` 10분 동안 메모리·디스크가 과금 대상 |
| Azure Container Apps | 무료분 vCPU 180,000초, 메모리 360,000 GiB-초 (Cloud Run과 같은 규모) | **HTTP 인그레스 240초 제한**으로 긴 영상 불가. 종량제 전환 시 지출 상한 설정 불가 |
| Azure Functions | Flex Consumption 상시 무료분 있음, ffmpeg 마운트 예시 있음 | **HTTP 응답 230초 제한**(플랜 무관). Flex는 컨테이너 불가 |
| Netlify Functions | 과금 대신 정지(300 크레딧/월, 하드 리밋), 도쿄 리전 | **동기 60초**, 메모리 1GB 고정, 스트리밍 **20MB 상한**. 3~4분 곡도 빠듯하고 FLAC 실패 |
| OCI Functions | Oracle 네트워크 — 현재 YouTube 접근이 확인된 유일한 계열. 커스텀 Dockerfile 지원, 월 200만 호출·400,000 GB-초 무료분 표기 | **응답 최대 6MB**(스트리밍 우회 없음). HTTP 호출에 API Gateway 필요(300초, 응답 본문 읽기 15초). Always Free 전용 계정에 적용되는지 확인 못함. Object Storage에 올리고 사전 인증 URL을 주는 우회는 가능하나 미검증 |

## 제외

| 플랫폼 | 제외 이유 |
|---|---|
| Render (무료) | 0.1 CPU / 512MB — 현재 1/8 OCPU(0.125)보다 느림. 15분 비활성 시 슬립, 기동 약 1분 |
| Koyeb (무료) | 0.1 vCPU / 512MB, HTTP 100초, 무료는 프랑크푸르트·워싱턴만. 약관이 프록시 익명화 서비스 금지 |
| Fly.io | 영구 무료 없음. 체험 2시간 또는 7일 |
| Railway | 체험 후 무료 플랜은 월 $1 크레딧(0.5GB 상시 가동 약 6일분). 약관이 "서비스 약관을 위반하는 봇·스크래퍼", 프록시 운영 금지 |
| Hugging Face Spaces | Docker Space 생성에 **PRO($9/월) 필요**. 외부 연결 포트 80/443/8080만. 콘텐츠 정책이 프록시로 제한 우회 금지 |
| Northflank | 결제 수단 필수, 무료 등급 vCPU/RAM 비공개 |
| Cloudflare Workers (무료) | 요청당 CPU 10ms, `child_process` 비동작 stub |
| Supabase Edge Functions | 요청당 CPU 2초 |
| Deno Deploy | 서브프로세스는 되지만 사용 가능한 도구가 보장되지 않고 바이너리 동봉 방법이 문서에 없음. 512MB, 미국·유럽 리전만 |

## 플랫폼 공통 위험

**1. YouTube 봇 차단.** 모든 후보가 클라우드 IP(Google·AWS·Azure·Cloudflare)로 나간다. 현재 서버가 WARP를 쓰는 이유가 클라우드 IP 차단인데, 서버리스에서는 WARP 데몬을 상주시킬 수 없다. Koyeb·Railway·Hugging Face는 약관이 프록시를 금지해 우회 수단도 막혀 있다. 이 문서의 어떤 플랫폼도 이 점을 해결한다고 볼 근거가 없다.

**2. 공개 URL에서의 요금 사고.** 인증이 없으므로(운영 선호) 누군가 반복 호출하면 과금형 플랫폼(Cloud Run·Lambda·Azure)에서 비용이 발생한다. 과금형을 고르면 **최대 인스턴스 수 1~2개 제한과 예산 알림이 필수**다. Vercel Hobby와 Netlify는 한도 초과 시 정지하므로 이 위험이 없다.

## 권고

1. 무료 티어만으로 현재 기능을 제약 없이 유지하는 것은 불가능하다.
2. 옮긴다면 **Cloud Run이 1순위**(구조 변경 최소, 60분), 카드 없이 요금 위험 없이 가려면 **Vercel이 2순위**다.
3. PoC는 **같은 테스트 코드로 두 곳을 함께** 잰다. yt-dlp(node) + ffmpeg로 짧은 곡 약 20회를 받는 스크립트를 컨테이너 하나로 만들면 Cloud Run에는 그대로, Vercel에는 함수로 올릴 수 있다. 측정 항목: 성공률, 벽시계·CPU 사용량, 동시 요청 시 속도.
4. 두 곳 모두 YouTube가 막히면 서버리스는 접고 더 큰 VM이 답이다. Oracle Ampere A1은 춘천 리전에서 제공되지 않는다.

## 출처

**Google Cloud**
- 요금·무료 한도·Tier: https://cloud.google.com/run/pricing
- 무료 프로그램·체험판: https://docs.cloud.google.com/free/docs/free-cloud-features (2026-09-24)
- 지출 상한: https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps (2026-09-24)
- 요청 타임아웃: https://docs.cloud.google.com/run/docs/configuring/request-timeout
- 할당량·응답 크기: https://docs.cloud.google.com/run/quotas (2026-09-24)
- 파일시스템: https://docs.cloud.google.com/run/docs/container-contract
- 리전: https://docs.cloud.google.com/run/docs/locations
- AUP: https://cloud.google.com/terms/aup (2026-06-23)

**Vercel**
- 함수 제한: https://vercel.com/docs/functions/limitations (2026-08-24)
- Hobby 플랜: https://vercel.com/docs/plans/hobby (2026-09-14)
- Container Images: https://vercel.com/docs/functions/container-images (2026-07-07)

**AWS**
- 무료 플랜: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html , https://aws.amazon.com/free/free-tier-faqs/
- Lambda 요금: https://aws.amazon.com/lambda/pricing/
- Lambda 제한: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- 응답 스트리밍: https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
- 스트리밍 전 리전 지원: https://aws.amazon.com/about-aws/whats-new/2026/04/aws-lambda-response-streaming/
- Budgets 제어: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html
- AUP: https://aws.amazon.com/aup/

**Azure**
- 무료 계정: https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account
- 지출 한도: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit (2026-04-29)
- Functions 요금: https://azure.microsoft.com/en-us/pricing/details/functions/
- Functions 플랜 비교: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale (2026-09-16)
- Flex Consumption: https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan (2026-09-25)
- Container Apps 요금: https://azure.microsoft.com/en-us/pricing/details/container-apps/
- Container Apps 인그레스: https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview

**Cloudflare**
- Workers 제한: https://developers.cloudflare.com/workers/platform/limits/ (2026-09-05)
- Node.js 호환성: https://developers.cloudflare.com/workers/runtime-apis/nodejs/ (2026-08-12)
- Containers 요금: https://developers.cloudflare.com/containers/pricing/ (2026-08-28)
- Containers 제한·FAQ: https://developers.cloudflare.com/containers/platform-details/limits/ , https://developers.cloudflare.com/containers/faq/

**Oracle**
- Always Free 자원: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Functions 설정·제한: https://docs.oracle.com/en-us/iaas/Content/Functions/Tasks/functionscustomizing.htm , https://docs.oracle.com/en-us/iaas/Content/Functions/Tasks/functionstroubleshooting_topic-Issues-invoking-functions.htm
- API Gateway 제한: https://docs.oracle.com/en-us/iaas/Content/APIGateway/Reference/apigatewaylimits.htm

**Netlify**
- 크레딧 요금: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ (2026-09-01)
- 함수 설정: https://docs.netlify.com/build/functions/configuration/ (2026-09-17)

**PaaS**
- Render: https://render.com/docs/free , https://render.com/docs/compute-plans
- Koyeb: https://www.koyeb.com/docs/reference/instances , https://www.koyeb.com/docs/reference/edge-network , https://www.koyeb.com/docs/legal/terms (2026-05-27)
- Fly.io: https://docs.fly.io/about/free-trial/
- Railway: https://docs.railway.com/reference/pricing/plans , https://railway.com/legal/fair-use
- Hugging Face: https://huggingface.co/docs/hub/spaces-overview , https://huggingface.co/content-policy
- Northflank: https://northflank.com/pricing
- Deno Deploy: https://docs.deno.com/deploy/reference/runtime/ (2026-06-18)
- Supabase: https://supabase.com/docs/guides/functions/limits

## 이번 검토의 확인 범위

- 공식 문서·요금표·약관 조사. 플랫폼별 조사는 세 갈래로 나눠 진행했고, 순위를 가르는 수치는 원문으로 재확인했다.
- 문서에 명시되지 않은 항목은 "확인 못함"으로 남겼다. 월 무료 곡 수는 실측값을 대입한 추정이다.
- 어떤 플랫폼에도 배포하지 않았고 계정·리소스를 만들지 않았다. 각 플랫폼 IP에서의 YouTube 접근은 **검증하지 않았다**.
