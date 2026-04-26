/* 物流查询 API */
const API_URL = 'https://kzexpress.market.alicloudapi.com/api-mall/api/express/query';
const APP_CODE = '823c6865aab74486a5ada6743e9a5004';

/**
 * 调用物流查询接口
 * @param {Object} params
 * @param {string} params.expressNo 快递单号（必填）
 * @param {string} [params.mobile] 手机号后四位（选填）
 * @param {string} [params.cpCode] 快递公司编码（选填）
 * @returns {Promise<Object>}
 */
function queryLogistics({ expressNo, mobile, cpCode }) {
  return new Promise((resolve, reject) => {
    if (!expressNo || !expressNo.trim()) {
      reject({ code: 'EMPTY_EXPRESS_NO', message: '请输入快递单号' });
      return;
    }

    const body = { expressNo: expressNo.trim() };

    // 顺丰/中通/跨越 需手机号后4位
    const sfLike = cpCode === 'SF' || cpCode === 'ZTO' || cpCode === 'KYSY';
    if (mobile && mobile.trim()) {
      const m = mobile.trim();
      if (!/^\d{4}$/.test(m)) {
        reject({ code: 'INVALID_MOBILE', message: '手机号必须为4位数字（顺丰/中通/跨越需填写）' });
        return;
      }
      body.mobile = m;
    } else if (sfLike) {
      console.warn('顺丰/中通/跨越未填手机号后四位，可能查不到轨迹');
    }

    if (cpCode && cpCode.trim()) {
      body.cpCode = cpCode.trim();
    }

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `APPCODE ${APP_CODE}`,
      },
      body: JSON.stringify(body),
    })
      .then(res => {
        if (res.status >= 500) {
          reject({ code: 'SERVER_ERROR', message: '快递服务暂不可用，请稍后重试' });
          return;
        }
        return res.json();
      })
      .then(data => {
        if (!data) {
          reject({ code: 'EMPTY_RESPONSE', message: '快递服务返回空数据，请稍后重试' });
          return;
        }
        if (!data.success || data.code !== 200) {
          reject({ code: 'API_ERROR', message: data.msg || '查询失败，请检查单号是否正确' });
          return;
        }
        resolve(data.data);
      })
      .catch(err => {
        reject({ code: 'NETWORK_ERROR', message: '网络请求失败，请检查网络连接' });
      });
  });
}

/**
 * 判断是否查不到物流（无轨迹）
 */
function hasNoTraceData(data) {
  if (!data) return true;
  const noTrace = !data.logisticsTraceDetailList || data.logisticsTraceDetailList.length === 0;
  return noTrace && !data.cpCode;
}