// @ts-ignore
// @ts-ignore
import { ElNotification } from 'element-plus'
/* HTTP Error handling */
// @ts-ignore
import ExtendableError from 'extendable-error-class'
import { API_BASE } from '@/config'
class HTTPError extends ExtendableError {
    // @ts-ignore
    constructor(err) {
        super(err.message)
        // eslint-disable-next-line guard-for-in
        for (const i in err) {
            // @ts-ignore
            this[i] = err[i]
        }
        // @ts-ignore
        this.name = 'HTTPError'
    }
}
function getErrorMessage(data: any): string {
    if (data.error) return data.error
    if (data.msg) return data.msg
    if (data.message) return data.message
    return JSON.stringify(data)
}
