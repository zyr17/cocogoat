/**
 * 圣遗物过滤器
 *
 */
import { Dictionary } from 'lodash'
import { Artifact, ArtifactParam } from './Artifact'
import { ArtifactToSetPosition } from './ArtifactMap'
export enum SubFilterEquation {
    '<',
    '<=',
    '>',
    '>=',
    '=',
}
export class SubFilter {
    name: string = ''
    value: string = '0'
    equation: SubFilterEquation = SubFilterEquation['>']
    constructor (data?: any) {
        if (!data) return;
        for (const i in data)
            if (this.hasOwnProperty(i)) {
            	// @ts-ignore
                this[i] = data[i];
            }
    }
    filterOne(input: ArtifactParam): number {
        if (this.name !== input.name) return 0
        if ((input.value.indexOf('%') === -1) !== (this.value.indexOf('%') === -1)) return 0 // 一个有%一个没有，不同类
        const value = parseFloat(input.value.replaceAll(',', ''))
        const thisvalue = parseFloat(this.value.replaceAll(',', ''))
        if (this.equation === SubFilterEquation['<']) return value < thisvalue ? 1 : 0
        if (this.equation === SubFilterEquation['<=']) return value <= thisvalue ? 1 : 0
        if (this.equation === SubFilterEquation['>']) return value > thisvalue ? 1 : 0
        if (this.equation === SubFilterEquation['>=']) return value >= thisvalue ? 1 : 0
        // remain '='
        return value === thisvalue ? 1 : 0
    }
    filter(input: ArtifactParam[]): number {
        let res = 0
        for (const i of input) res += this.filterOne(i)
        return res
    }
}
export class ArtifactFilter {
    main: String[] = []
    stars: Number[] = []
    level: Number[] = []
    name: String[] = []
    set: String[] = []
    position: String[] = []
    subCount: Number[] = []
    includeSub: SubFilter[] = []
    includeSubCount: number = 0
    excludeSub: SubFilter[] = []
    excludeSubCount: number = 0
    private filterOne<T>(input: T, filter: T[]): boolean {
        if (filter.length === 0) return true
        return filter.indexOf(input) !== -1
    }
    private filterSub(input: ArtifactParam[], filters: SubFilter[], targetCount: number, empty: boolean): boolean {
        if (filters.length === 0) return empty
        let matchCount = 0
        for (const filter of filters) matchCount += filter.filter(input)
        return targetCount <= matchCount
    }
    filter(artifact: Artifact): boolean {
        let inFilter = true
        inFilter &&= this.filterOne(artifact.main.name, this.main)
        inFilter &&= this.filterOne(artifact.stars, this.stars)
        inFilter &&= this.filterOne(artifact.level, this.level)
        inFilter &&= this.filterOne(artifact.name, this.name)
        const [set, position] = ArtifactToSetPosition.get(artifact.name) || ['', '']
        inFilter &&= this.filterOne(set, this.set)
        inFilter &&= this.filterOne(position, this.position)
        inFilter &&= this.filterOne(artifact.sub.length, this.subCount)
        const subInclude = this.filterSub(artifact.sub, this.includeSub, this.includeSubCount, true)
        const subExclude = this.filterSub(artifact.sub, this.excludeSub, this.excludeSubCount + 1, false)
        inFilter = inFilter && subInclude && !subExclude
        return inFilter
    }
    loadFromJSON(str: string) {
        const data = JSON.parse(str);
        for (const i in data)
            if (this.hasOwnProperty(i))
                if (i === 'includeSub' || i === 'excludeSub') {
                    this[i] = [];
                    for (let j = 0; j < data[i].length; j ++ )
                        this[i].push(new SubFilter(data[i][j]));
                }
                // @ts-ignore
                else this[i] = data[i];
    }
}
