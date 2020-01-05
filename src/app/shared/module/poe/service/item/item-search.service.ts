import { Injectable } from '@angular/core';
import * as PoETrade from '@data/poe-trade';
import { Item, ItemSearchResult, Language, SearchItem } from '@shared/module/poe/type';
import { forkJoin, Observable, of } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { ContextService } from '../context.service';
import { CurrencyService } from '../currency/currency.service';
import { ItemSearchFormService } from './item-search-form.service';

@Injectable({
    providedIn: 'root'
})
export class ItemSearchService {
    constructor(
        private readonly context: ContextService,
        private readonly currencyService: CurrencyService,
        private readonly searchFormService: ItemSearchFormService,
        private readonly searchHttpService: PoETrade.SearchHttpService) { }

    public search(requestedItem: Item, leagueId?: string): Observable<ItemSearchResult> {
        leagueId = leagueId || this.context.get().leagueId;

        const form = new PoETrade.SearchForm();
        form.league = leagueId;
        form.online = 'x';
        form.capquality = 'x';
        this.searchFormService.map(requestedItem, form);

        return this.searchHttpService.search(form).pipe(
            flatMap(response => {
                if (response.items.length <= 0) {
                    const result: ItemSearchResult = {
                        items: [],
                        url: response.url
                    };
                    return of(result);
                }
                const items$ = response.items
                    .map(item => this.createSearchItem(requestedItem, item));

                return forkJoin(items$).pipe(
                    map(items => {
                        const result: ItemSearchResult = {
                            items: items.filter(item => item !== undefined),
                            url: response.url
                        };
                        return result;
                    })
                );
            })
        );
    }

    private createSearchItem(requestedItem: Item, searchResponseItem: PoETrade.SearchItem): Observable<SearchItem> {
        // `1 alteration`
        const splittedValue = searchResponseItem.value.split(' ');
        const currencyAmount = +(splittedValue[0].trim());
        const currencyId = splittedValue[1].trim();

        return this.currencyService.searchByTradeId(currencyId, Language.English).pipe(
            map(currency => {

                if (currency === undefined) {
                    console.warn(`Could not parse '${currencyId}' as currency.`);
                    return undefined;
                }

                const item: SearchItem = {
                    ...requestedItem,
                    currency,
                    currencyAmount
                };
                return item;
            })
        );
    }
}
