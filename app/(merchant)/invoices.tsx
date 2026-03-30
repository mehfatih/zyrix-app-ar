import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal } from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { invoicesApi } from '../../services/api'
import { StatusBadge } from '../../components/StatusBadge'

const isRTL = I18nManager.isRTL

export default function InvoicesScreen() {
  const { t } = useTranslation()
  const [invoices, setInvoices] = useState<Array<{id:string;invoiceId:string;customerName:string;total:string;currency:string;status:string;createdAt:string}>>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ customerName: '', itemDesc: '', quantity: '1', unitPrice: '' })

  const fetchData = useCallback(async () => {
    try { const res = await invoicesApi.list(); setInvoices(res.invoices) } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!form.customerName || !form.itemDesc || !form.unitPrice) return
    setCreating(true)
    try {
      await invoicesApi.create({
        customerName: form.customerName,
        items: [{ description: form.itemDesc, quantity: parseInt(form.quantity) || 1, unitPrice: parseFloat(form.unitPrice) }],
      })
      setShowCreate(false); setForm({ customerName: '', itemDesc: '', quantity: '1', unitPrice: '' }); fetchData()
    } catch (e: unknown) { Alert.alert(t('common.error'), e instanceof Error ? e.message : '') }
    setCreating(false)
  }

  const handleAction = async (invoiceId: string, action: 'send' | 'mark-paid') => {
    try {
      if (action === 'send') await invoicesApi.send(invoiceId)
      else await invoicesApi.markPaid(invoiceId)
      fetchData()
    } catch {}
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetchData()}} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={s.header}>
          <Text style={[s.title, isRTL && s.rtl]}>{t('invoices.title')}</Text>
          <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.createBtnText}>+ {t('invoices.create')}</Text>
          </TouchableOpacity>
        </View>

        {invoices.length === 0 ? (
          <View style={s.center}><Text style={s.emptyText}>{t('invoices.no_invoices')}</Text></View>
        ) : invoices.map(inv => (
          <View key={inv.id} style={s.card}>
            <View style={[s.cardRow, isRTL && s.cardRowRTL]}>
              <View style={{flex:1}}>
                <Text style={s.cardTitle}>{inv.customerName}</Text>
                <Text style={s.cardId}>{inv.invoiceId} · {new Date(inv.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={{alignItems:'flex-end'}}>
                <Text style={s.cardAmount}>{inv.currency} {Number(inv.total).toLocaleString()}</Text>
                <StatusBadge status={inv.status} />
              </View>
            </View>
            <View style={[s.cardActions, isRTL && s.cardRowRTL]}>
              {inv.status === 'draft' && (
                <TouchableOpacity style={s.actionBtn} onPress={() => handleAction(inv.invoiceId, 'send')}>
                  <Text style={s.actionText}>{t('invoices.send')}</Text>
                </TouchableOpacity>
              )}
              {(inv.status === 'sent' || inv.status === 'draft') && (
                <TouchableOpacity style={[s.actionBtn,{backgroundColor:COLORS.successBg}]} onPress={() => handleAction(inv.invoiceId, 'mark-paid')}>
                  <Text style={[s.actionText,{color:COLORS.success}]}>{t('invoices.mark_paid')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modal}>
          <Text style={s.modalTitle}>{t('invoices.create')}</Text>
          <TextInput placeholder={t('invoices.customer')} value={form.customerName} onChangeText={v=>setForm({...form,customerName:v})} style={s.input} placeholderTextColor={COLORS.textMuted} />
          <TextInput placeholder={t('invoices.items') + ' - ' + t('payment_links.description')} value={form.itemDesc} onChangeText={v=>setForm({...form,itemDesc:v})} style={s.input} placeholderTextColor={COLORS.textMuted} />
          <View style={{flexDirection:'row',gap:8}}>
            <TextInput placeholder="Qty" value={form.quantity} onChangeText={v=>setForm({...form,quantity:v})} style={[s.input,{flex:1}]} placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" />
            <TextInput placeholder={t('subscriptions.amount')} value={form.unitPrice} onChangeText={v=>setForm({...form,unitPrice:v})} style={[s.input,{flex:2}]} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
          </View>
          <Text style={s.taxNote}>{t('invoices.tax')} 18% KDV</Text>
          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowCreate(false)}><Text style={{color:COLORS.textSecondary}}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={s.modalSubmit} onPress={handleCreate} disabled={creating}><Text style={{color:COLORS.white,fontWeight:'700'}}>{creating ? '...' : t('invoices.create')}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.deepBg},scroll:{paddingBottom:40},center:{flex:1,justifyContent:'center',alignItems:'center',padding:40},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',padding:20},
  title:{fontSize:22,fontWeight:'700',color:COLORS.textPrimary},rtl:{textAlign:'right'},
  createBtn:{backgroundColor:COLORS.primary,paddingHorizontal:14,paddingVertical:10,borderRadius:10},
  createBtnText:{color:COLORS.white,fontSize:13,fontWeight:'600'},emptyText:{color:COLORS.textMuted,fontSize:15},
  card:{backgroundColor:COLORS.cardBg,marginHorizontal:16,marginBottom:10,borderRadius:14,borderWidth:1,borderColor:COLORS.border,padding:16},
  cardRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},cardRowRTL:{flexDirection:'row-reverse'},
  cardTitle:{fontSize:16,fontWeight:'600',color:COLORS.textPrimary,marginBottom:2},
  cardId:{fontSize:11,color:COLORS.textMuted,fontFamily:'monospace'},cardAmount:{fontSize:18,fontWeight:'700',color:COLORS.success,marginBottom:4},
  cardActions:{flexDirection:'row',gap:8,marginTop:12,borderTopWidth:1,borderTopColor:COLORS.divider,paddingTop:12},
  actionBtn:{flex:1,backgroundColor:COLORS.surfaceBg,paddingVertical:8,borderRadius:8,alignItems:'center'},
  actionText:{fontSize:13,fontWeight:'600',color:COLORS.primary},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  modal:{backgroundColor:COLORS.cardBg,borderTopLeftRadius:20,borderTopRightRadius:20,padding:24},
  modalTitle:{fontSize:20,fontWeight:'700',color:COLORS.textPrimary,marginBottom:20,textAlign:'center'},
  input:{backgroundColor:COLORS.surfaceBg,borderWidth:1,borderColor:COLORS.border,borderRadius:10,paddingHorizontal:16,paddingVertical:14,color:COLORS.textPrimary,fontSize:15,marginBottom:12},
  taxNote:{fontSize:12,color:COLORS.textMuted,textAlign:'center',marginBottom:8},
  modalActions:{flexDirection:'row',gap:12,marginTop:8},
  modalCancel:{flex:1,paddingVertical:14,borderRadius:10,alignItems:'center',backgroundColor:COLORS.surfaceBg},
  modalSubmit:{flex:1,paddingVertical:14,borderRadius:10,alignItems:'center',backgroundColor:COLORS.primary},
})
